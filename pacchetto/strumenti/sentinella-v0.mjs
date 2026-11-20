// Sentinella v0: esperimento locale, non una barriera di sicurezza.
// Esegue un solo TODO per volta in una copia separata del laboratorio.
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';

export function creaSentinella({ radice, porta, todoFile }) {
  let corrente = null;
  const runs = new Map();
  const base = path.join(radice, 'output', 'sentinella-v0');
  const archivio = path.join(base, 'lavori.json');
  // L'archivio conserva l'associazione TODO/lavoro anche dopo il riavvio.
  try {
    const precedenti = JSON.parse(fsSync.readFileSync(archivio, 'utf8'));
    if (Array.isArray(precedenti)) for (const job of precedenti.slice().reverse()) {
      if (!job?.id || !job.todoId) continue;
      if (['in_coda', 'in_esecuzione'].includes(job.stato)) {
        job.stato = 'interrotto';
        job.messaggi = [...(job.messaggi || []), 'Server riavviato: esito da verificare nella copia.'];
      }
      runs.set(job.id, job);
    }
  } catch (e) { if (e.code !== 'ENOENT') console.error('Archivio Sentinella non leggibile:', e.message); }
  let scrittura = Promise.resolve();
  function salvaLavori() {
    const dati = JSON.stringify([...runs.values()].map(({filesPrima,...job})=>job).reverse().slice(0,100), null, 2)+'\n';
    scrittura = scrittura.then(async()=>{await fs.mkdir(base,{recursive:true});await fs.writeFile(archivio,dati,'utf8');}).catch(e=>console.error('Archivio Sentinella non salvato:',e));
  }

  const codex = process.env.SENTINELLA_CODEX_JS || path.join(path.dirname(process.execPath), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  const reply = (res, code, body) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
  const safeOrigin = req => {
    const hosts = [`127.0.0.1:${porta}`, `localhost:${porta}`];
    return hosts.includes(req.headers.host) && hosts.some(h => req.headers.origin === `http://${h}`) && req.headers['x-sentinella-local'] === 'v0';
  };
  function log(job, message) {
    if (!message) return;
    job.messaggi.push(String(message).slice(0, 2000));
    if (job.messaggi.length > 100) job.messaggi.shift();
    salvaLavori();
  }
  async function listFiles(dir, root=dir, output={}) {
    for (const entry of await fs.readdir(dir, {withFileTypes:true})) {
      const p = path.join(dir, entry.name), rel = path.relative(root, p).replaceAll('\\','/');
      if (entry.isSymbolicLink() || rel === 'node_modules' || rel.startsWith('node_modules/')) continue;
      if (entry.isDirectory()) await listFiles(p, root, output);
      else if(entry.isFile()){const st=await fs.stat(p);output[rel]=`${st.size}:${st.mtimeMs}`;}
    }
    return output;
  }
  async function copyIfPresent(src, dest) {
    try { await fs.access(src); } catch(e) { if(e.code==='ENOENT')return; throw e; }
    await fs.mkdir(path.dirname(dest), {recursive:true});
    await fs.cp(src, dest, {recursive:true, errorOnExist:true, force:false, dereference:false, filter:async p=>!(await fs.lstat(p)).isSymbolicLink()});
  }
  async function prepare(job) {
    await fs.mkdir(base,{recursive:true});
    job.cartella=await fs.mkdtemp(path.join(base,'lavoro-'));
    const dest=job.cartella;
    // Copia esplicita: niente .git, profili personali, altri output o ZIP originali.
    for(const rel of ['package.json','package-lock.json','pacchetto','tools','confronto-avatar-3d/modelli/kaykit2','assets_originali/kaykit/assets-kaykit-3d-props-main/assets-kaykit-3d-props-main/assets/kaykit/furniture-bits-1.0/Assets/gltf','node_modules'])
      await copyIfPresent(path.join(radice,rel),path.join(dest,rel));
    const src=path.join(radice,'confronto-avatar-3d'), dst=path.join(dest,'confronto-avatar-3d');await fs.mkdir(dst,{recursive:true});
    for(const entry of await fs.readdir(src,{withFileTypes:true}))if(entry.isFile())await copyIfPresent(path.join(src,entry.name),path.join(dst,entry.name));
    job.filesPrima=await listFiles(dest);
  }
  async function execute(job) {
    try {
      log(job,'Preparazione della copia di prova.'); await prepare(job);
      job.stato='in_esecuzione';job.iniziato=new Date().toISOString();
      const prompt = `Esegui il TODO seguente solo nella copia di prova corrente. Non modificare altri percorsi. Il progetto reale non va modificato né pubblicato. La copia è parziale: se mancano dati o strumenti, dichiaralo esplicitamente. Verifica il risultato in misura adeguata e riassumi i file cambiati e le verifiche. Non modificare il registro TODO.\n\nTODO (${job.todoId}):\n${job.testo}`;
      const child=spawn(process.execPath,[codex,'exec','--json','--sandbox','workspace-write','--skip-git-repo-check','-C',job.cartella,'-'],{cwd:job.cartella,windowsHide:true,stdio:['pipe','pipe','pipe']});
      const lines=createInterface({input:child.stdout});
      lines.on('line',line=>{try{const e=JSON.parse(line);if(e.type==='thread.started')job.threadId=e.thread_id;if(e.type==='item.completed'&&e.item?.type==='agent_message'){job.risultato=e.item.text||'';log(job,job.risultato);}else if(e.type==='turn.failed'||e.type==='error')log(job,e.error?.message||e.message||line);else if(e.type==='item.completed'&&e.item?.type==='command_execution')log(job,`Comando terminato: ${e.item.exit_code ?? 'stato non disponibile'}`);}catch{log(job,line);}});
      child.stderr.on('data',chunk=>log(job,chunk.toString('utf8')));
      child.stdin.on('error',()=>{});child.stdin.end(prompt,'utf8');
      const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
      const after=await listFiles(job.cartella);const names=new Set([...Object.keys(job.filesPrima),...Object.keys(after)]);
      job.fileModificati=[...names].filter(n=>job.filesPrima[n]!==after[n]).sort().slice(0,200);delete job.filesPrima;
      job.codiceUscita=code;job.finito=new Date().toISOString();job.stato=code===0?'da_verificare':'fallito';
      if(code===0&&!job.risultato)log(job,'Processo terminato senza messaggio finale strutturato; verificare la copia.');
      log(job,code===0?'Esecuzione terminata: risultato da verificare.':'Esecuzione fallita; il TODO rimane aperto.');
    } catch(e) {delete job.filesPrima;job.stato='fallito';job.finito=new Date().toISOString();log(job,'Errore: '+e.message);}
    finally {corrente=null;}
  }
  return async function route(req,res){
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname!=='/api/sentinella-v0'&&!url.pathname.startsWith('/api/sentinella-v0/'))return false;
    if(req.method==='GET'&&url.pathname==='/api/sentinella-v0'){reply(res,200,{corrente, lavori:[...runs.values()].map(({filesPrima,...j})=>j).reverse().slice(0,20)});return true;}
    if(req.method!=='POST'||url.pathname!=='/api/sentinella-v0'){reply(res,405,{errore:'Metodo non disponibile'});return true;}
    if(!safeOrigin(req)||!String(req.headers['content-type']||'').startsWith('application/json')){reply(res,403,{errore:'Richiesta non locale o origine non ammessa.'});return true;}
    if(corrente){reply(res,409,{errore:'Un lavoro è già in corso.'});return true;}
    let body='';try{for await(const chunk of req){body+=chunk;if(body.length>4096){reply(res,413,{errore:'Richiesta troppo grande.'});return true;}}const input=JSON.parse(body);if(typeof input.id!=='string'||input.id.length>100){reply(res,400,{errore:'ID non valido.'});return true;}
      // Prenotazione immediata prima della lettura asincrona, contro doppio avvio.
      const id=randomUUID();corrente=id;let task;
      try{const data=JSON.parse(await fs.readFile(todoFile,'utf8'));task=data.attivita?.find(t=>t.id===input.id);}catch(e){corrente=null;throw e;}
      if(!task||task.completato){corrente=null;reply(res,404,{errore:'TODO inesistente o già completato.'});return true;}
      const job={id,todoId:task.id,testo:task.testo,stato:'in_coda',creato:new Date().toISOString(),messaggi:[],fileModificati:[],cartella:null,risultato:''};runs.set(id,job);salvaLavori();reply(res,202,{lavoro:job});void execute(job);return true;
    }catch(e){corrente=null;reply(res,400,{errore:'Impossibile avviare: '+e.message});return true;}
  };
}
