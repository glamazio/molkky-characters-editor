import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generaBlob } from './genera-blob.js';
import { blobCompatibile, risolviBlob, memorizzaBlob } from './risolvi-blob.js';
import { stimaSeduta } from './requisiti-seduta.js';

const $ = id => document.getElementById(id);
const furniture = '/assets_originali/kaykit/assets-kaykit-3d-props-main/assets-kaykit-3d-props-main/assets/kaykit/furniture-bits-1.0/Assets/gltf/';
const models = {
  couch: { label: 'Divano', url: furniture + 'couch_pillows.gltf', width: 2.3 },
  chair: { label: 'Poltrona', url: furniture + 'armchair_pillows.gltf', width: 1.1 },
  table: { label: 'Tavolino', url: furniture + 'table_low.gltf', width: 1.15 },
  tv: { label: 'TV', url: furniture + 'monitor.gltf', width: .95 },
  lamp: { label: 'Lampada', url: furniture + 'lamp_standing.gltf', width: .48 },
  rug: { label: 'Tappeto', url: furniture + 'rug_rectangle_A.gltf', width: 2.2 },
  character: { label: 'Personaggio medium', url: '/confronto-avatar-3d/modelli/kaykit2/personaggi/Mannequin_Medium.glb' }
};
const loader = new GLTFLoader();
const scene = new THREE.Scene(); scene.background = new THREE.Color('#d8dfdf');
scene.add(new THREE.HemisphereLight(0xffffff, 0x697a86, 2));
const light = new THREE.DirectionalLight(0xffffff, 1.5); light.position.set(4, 8, 5); scene.add(light);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({color:0xb99e80, roughness:1})); floor.rotation.x = -Math.PI/2; floor.position.y = -.02; scene.add(floor);
const grid = new THREE.GridHelper(8, 16, 0x637682, 0x9ca8a7); grid.position.y = .002; scene.add(grid);
const camera = new THREE.PerspectiveCamera(38, 1, .01, 100); camera.position.set(6, 5, 7);
const renderer = new THREE.WebGLRenderer({canvas:$('view'),antialias:true}); renderer.outputColorSpace = THREE.SRGBColorSpace;
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0,.5,0); controls.enableDamping = true;
const ctx = $('plan').getContext('2d');
let items = [], selected = null, drag = null, mixer = null, action = null, animationData = null, zone = null, playing = false, blob = null, blobMesh = null, seatAnchor = null;
let libraryAnimations = [];
const clock = new THREE.Clock();
const status = message => $('status').textContent = message;
function resize() { const c = $('view'); const w = c.clientWidth, h = c.clientHeight; if(c.width !== w*devicePixelRatio || c.height !== h*devicePixelRatio){renderer.setPixelRatio(devicePixelRatio);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();} const p=$('plan'); if(p.width!==p.clientWidth*devicePixelRatio||p.height!==p.clientHeight*devicePixelRatio){p.width=p.clientWidth*devicePixelRatio;p.height=p.clientHeight*devicePixelRatio;} }
function planTransform(){const c=$('plan');return {cx:c.width/2,cy:c.height/2,s:Math.min(c.width,c.height)/8.5};}
function layer(item){return item.type==='rug'?0:item.type==='character'?2:1;}
function orderedItems(){return [...items].sort((a,b)=>layer(a)-layer(b));}
function drawItem(it,cx,cy,s){ctx.save();ctx.translate(cx+it.group.position.x*s,cy-it.group.position.z*s);ctx.rotate(it.group.rotation.y);if(it.type==='character'){ctx.fillStyle='rgba(246,179,72,.22)';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,2*s,-Math.PI/2-Math.PI/5,-Math.PI/2+Math.PI/5);ctx.closePath();ctx.fill();ctx.strokeStyle='#e39026';ctx.stroke();ctx.fillStyle='#efad48';ctx.beginPath();ctx.arc(0,0,.23*s,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#543617';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-.42*s);ctx.stroke();}else{ctx.fillStyle=it===selected?'#e8ad50':it.type==='rug'?'#b5aa8f':'#617e8c';ctx.fillRect(-it.size.x*it.scale*s/2,-it.size.z*it.scale*s/2,it.size.x*it.scale*s,it.size.z*it.scale*s);ctx.strokeStyle='#263540';ctx.strokeRect(-it.size.x*it.scale*s/2,-it.size.z*it.scale*s/2,it.size.x*it.scale*s,it.size.z*it.scale*s);}ctx.restore();}
function drawPlan(){const c=$('plan'),{cx,cy,s}=planTransform();ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#d4d4c5';ctx.fillRect(cx-4*s,cy-4*s,8*s,8*s);ctx.strokeStyle='#b5b8ab';ctx.lineWidth=1;for(let n=-4;n<=4;n+=.5){ctx.beginPath();ctx.moveTo(cx+n*s,cy-4*s);ctx.lineTo(cx+n*s,cy+4*s);ctx.moveTo(cx-4*s,cy+n*s);ctx.lineTo(cx+4*s,cy+n*s);ctx.stroke();}
 for(const item of orderedItems())if(layer(item)===0)drawItem(item,cx,cy,s);
 // In pianta l'alto è +Z, cioè il fronte del manichino; X resta verso destra.
 const character=items.find(i=>i.type==='character');if(character&&blob){ctx.save();ctx.translate(cx+character.group.position.x*s,cy-character.group.position.z*s);ctx.rotate(character.group.rotation.y);ctx.scale(character.scale,-character.scale);ctx.fillStyle='rgba(217,55,55,.35)';const seen=new Set();for(const [x,,z] of blob.celle){const key=x+','+z;if(seen.has(key))continue;seen.add(key);ctx.fillRect(x*blob.passo*s,z*blob.passo*s,blob.passo*s+.5,blob.passo*s+.5);}ctx.restore();}
 if(character&&seatAnchor){const pos=character.group.localToWorld(seatAnchor.clone());ctx.save();ctx.strokeStyle='#067c82';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx+pos.x*s,cy-pos.z*s,.16*s,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const item of orderedItems())if(layer(item)>0)drawItem(item,cx,cy,s);
}
function sync(){const it=selected, locked=!!it?.seatFor; $('selected').textContent=it?models[it.type].label+(locked?' · collegata al personaggio':''):'Nessun elemento';for(const id of ['x','y','z','rotation','scale'])$(id).disabled=!it||locked;$('remove').disabled=!it;renderLayers(); if(!it)return; for(const axis of ['x','y','z'])$(axis).value=it.group.position[axis].toFixed(2);$('rotation').value=Math.round(THREE.MathUtils.radToDeg(it.group.rotation.y));$('scale').value=it.scale.toFixed(2);}
function renderLayers(){const list=$('layers');list.replaceChildren();for(const item of orderedItems().reverse()){const b=document.createElement('button');b.className='asset';b.textContent=(item===selected?'● ':'○ ')+models[item.type].label+(item.seatFor?' · collegata':'')+(item.type==='rug'?' · superficie':'');b.setAttribute('aria-pressed',String(item===selected));b.onclick=()=>{selected=item;sync();};list.append(b);}if(!items.length)list.textContent='Nessun elemento nella scena.';}
async function add(type, data={}){const def=models[type];if(!def)throw Error('Oggetto sconosciuto: '+type);if(type==='character'&&items.some(i=>i.type==='character'))throw Error('La bozza usa un solo personaggio di riferimento.');const gltf=await loader.loadAsync(def.url);const object=gltf.scene;object.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object), size=bounds.getSize(new THREE.Vector3());if(!size.x||!size.y||!size.z)throw Error('Dimensioni non valide: '+def.label);const base=def.width?def.width/size.x:1;object.scale.setScalar(base);object.position.set(-(bounds.min.x+bounds.max.x)*base/2,-bounds.min.y*base,-(bounds.min.z+bounds.max.z)*base/2);const group=new THREE.Group();group.add(object);group.position.set(data.x??0,data.y??0,data.z??0);group.rotation.y=THREE.MathUtils.degToRad(data.rotation??0);const scale=data.scale??1;group.scale.setScalar(scale);scene.add(group);const item={type,group,scale,size:size.multiplyScalar(base),seatFor:type==='chair'?data.seatFor:undefined};items.push(item);selected=item;sync();if(type==='character'){try{const lib=await loader.loadAsync('/confronto-avatar-3d/modelli/kaykit2/animazioni/Rig_Medium_General.glb');const idle=lib.animations.find(a=>a.name==='Idle_A');if(idle){const clip=idle.clone();clip.tracks=clip.tracks.filter(t=>!t.name.startsWith('handslot'));mixer=new THREE.AnimationMixer(object);mixer.clipAction(clip).play();}}catch(e){status('Posa Idle non disponibile: '+e.message);}}return item;}
for(const [id,def] of Object.entries(models)){const b=document.createElement('button');b.className='asset';b.textContent='+ '+def.label;b.onclick=()=>add(id,{x:.5,z:.5}).then(()=>id==='character'?chooseAnimation():null).catch(e=>status(e.message));$('library').append(b);}
function point(e){const r=$('plan').getBoundingClientRect(),t=planTransform();return {x:((e.clientX-r.left)*devicePixelRatio-t.cx)/t.s,z:(t.cy-(e.clientY-r.top)*devicePixelRatio)/t.s};}
$('plan').addEventListener('pointerdown',e=>{const p=point(e);selected=orderedItems().reverse().find(it=>{const dx=p.x-it.group.position.x,dz=p.z-it.group.position.z, a=it.group.rotation.y;const x=dx*Math.cos(a)-dz*Math.sin(a),z=dx*Math.sin(a)+dz*Math.cos(a);return Math.abs(x)<Math.max(.25,it.size.x*it.scale/2)&&Math.abs(z)<Math.max(.25,it.size.z*it.scale/2);})||null;sync();if(selected&&!selected.seatFor){drag={x:p.x-selected.group.position.x,z:p.z-selected.group.position.z};$('plan').setPointerCapture(e.pointerId);}});
$('plan').addEventListener('pointermove',e=>{if(!drag||!selected)return;const p=point(e);selected.group.position.x=p.x-drag.x;selected.group.position.z=p.z-drag.z;sync();});$('plan').addEventListener('pointerup',()=>drag=null);$('plan').addEventListener('pointercancel',()=>drag=null);
for(const id of ['x','y','z','rotation','scale'])$(id).addEventListener('input',()=>{if(!selected)return;const v=Number($(id).value);if(!Number.isFinite(v))return;if(['x','y','z'].includes(id))selected.group.position[id]=v;else if(id==='rotation')selected.group.rotation.y=THREE.MathUtils.degToRad(v);else if(v>0){selected.scale=v;selected.group.scale.setScalar(v);}});
$('remove').onclick=()=>{if(!selected)return;if(selected.type==='character'){mixer=null;action=null;zone=null;playing=false;clearBlob();$('play').disabled=$('time').disabled=true;}scene.remove(selected.group);items=items.filter(i=>i!==selected);selected=null;sync();};
function viewpoint(x,y,z){camera.position.set(x,y,z);controls.target.set(0,.5,0);controls.update();}$('front').onclick=()=>viewpoint(0,2,8);$('side').onclick=()=>viewpoint(8,2,0);$('perspective').onclick=()=>viewpoint(6,5,7);
$('save').onclick=()=>{const data={version:1,event:$('event').value,animation:$('animation').value,items:items.map(i=>({type:i.type,x:i.group.position.x,y:i.group.position.y,z:i.group.position.z,rotation:THREE.MathUtils.radToDeg(i.group.rotation.y),scale:i.scale,...(i.seatFor?{seatFor:i.seatFor}:{})}))};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='scena.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('open').onclick=()=>$('file').click();$('file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const data=JSON.parse(await f.text());if(data.version!==1||!Array.isArray(data.items)||data.items.some(i=>!models[i.type]||['x','y','z','rotation','scale'].some(k=>!Number.isFinite(i[k]))||i.scale<=0)||data.items.filter(i=>i.type==='character').length>1||(data.animation&&!libraryAnimations.some(a=>a.id===data.animation)))throw Error('Formato scena non valido');const old=items,oldAnimation=$('animation').value;items=[];for(const i of old)scene.remove(i.group);mixer=null;try{for(const i of data.items)await add(i.type,i);$('animation').value=data.animation||'';await chooseAnimation();}catch(err){for(const i of items)scene.remove(i.group);items=old;for(const i of old)scene.add(i.group);$('animation').value=oldAnimation;await chooseAnimation();throw err;}status('Scena caricata.');}catch(err){status('Impossibile aprire: '+err.message);}finally{e.target.value='';sync();}};
// Campionamento dei vertici realmente deformati, sul manichino a trasformazione
// unitaria. Il rettangolo risultante è conservativo e resta da validare.
async function chooseAnimation(){
  playing=false; $('play').textContent='▶ Riproduci'; zone=null; seatAnchor=null; clearBlob(); animationData=libraryAnimations.find(a=>a.id===$('animation').value)||null;
  $('seat-add').hidden=animationData?.richiede!=='seduta';$('seat-status').textContent='';if(animationData)$('event').value=animationData.evento;
  const character=items.find(i=>i.type==='character');
  if(!animationData||!character){$('play').disabled=$('time').disabled=true;validate();return;}
  try {
    const gltf=await loader.loadAsync(animationData.file); const source=gltf.animations.find(c=>c.name===animationData.clip);if(!source)throw Error('Clip non trovata');
    const clip=source.clone();clip.tracks=clip.tracks.filter(t=>!t.name.startsWith('handslot'));
    if(mixer)mixer.stopAllAction();const object=character.group.children[0];mixer=new THREE.AnimationMixer(object);action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    const g=character.group, position=g.position.clone(), rotation=g.rotation.y, scale=character.scale;
    g.position.set(0,0,0);g.rotation.y=0;g.scale.setScalar(1);scene.updateMatrixWorld(true);
    const box=new THREE.Box3();const samples=Math.ceil(clip.duration*30);
    for(let i=0;i<=samples;i++){mixer.setTime(Math.min(i/30,clip.duration));scene.updateMatrixWorld(true);box.union(new THREE.Box3().setFromObject(object,true));}
    if(animationData.richiede==='seduta'){
      seatAnchor=stimaSeduta({group:g,object,mixer,action,duration:clip.duration});
      $('seat-status').textContent=`Seduta richiesta: punto bacino stimato (${seatAnchor.x.toFixed(2)}, ${seatAnchor.y.toFixed(2)}, ${seatAnchor.z.toFixed(2)}). Contatto da verificare.`;
    }
    g.position.copy(position);g.rotation.y=rotation;g.scale.setScalar(scale);action.reset().play();mixer.setTime(0);scene.updateMatrixWorld(true);
    if(box.isEmpty())throw Error('Impossibile misurare la clip');zone=box;animationData.duration=clip.duration;
    $('time').max=clip.duration;$('time').value=0;$('time-label').textContent='0,00 s';$('play').disabled=$('time').disabled=false;$('blob-generate').disabled=$('blob-open').disabled=false;
    const match=await risolviBlob(animationData,'Mannequin_Medium');
    if(match){installBlob(match.data,g);$('blob-generate').disabled=$('blob-open').disabled=false;status(`Blob standard caricato per ${animationData.clip} (${match.fonte}). Da verificare.`);}else status('Clip pronta. Genera il blob per analizzare lo spazio.');validate();
  }catch(e){zone=null;$('play').disabled=$('time').disabled=true;status('Analisi non riuscita: '+e.message);validate();}
}
function clearBlob(){if(blobMesh){blobMesh.parent?.remove(blobMesh);blobMesh.geometry.dispose();blobMesh.material.dispose();blobMesh=null;}blob=null;$('blob-save').disabled=true;$('blob-generate').disabled=$('blob-open').disabled=true;}
function validBlob(data){return blobCompatibile(data,animationData,'Mannequin_Medium');}
function installBlob(data, group){
 clearBlob();blob=data;const geometry=new THREE.BoxGeometry(blob.passo,blob.passo,blob.passo), material=new THREE.MeshBasicMaterial({color:0xe54b46,transparent:true,opacity:.16,depthWrite:false});
 blobMesh=new THREE.InstancedMesh(geometry,material,blob.celle.length);const dummy=new THREE.Object3D();blob.celle.forEach(([x,y,z],i)=>{dummy.position.set((x+.5)*blob.passo,(y+.5)*blob.passo,(z+.5)*blob.passo);dummy.updateMatrix();blobMesh.setMatrixAt(i,dummy.matrix);});blobMesh.instanceMatrix.needsUpdate=true;blobMesh.visible=$('blob-visible').checked;group.add(blobMesh);$('blob-save').disabled=false;
}
function validate(){const character=items.find(i=>i.type==='character');if(!animationData||!blob||!character){const missing=animationData?.richiede==='seduta'&&!items.some(i=>i.seatFor===animationData.id&&i.type==='chair');$('validation').textContent=(missing?'Seduta obbligatoria mancante. ':'')+'Genera il blob per verificare lo spazio.';return;}
  character.group.updateWorldMatrix(true,false);const inverse=character.group.matrixWorld.clone().invert();const conflicts=[];
  for(const item of items){if(item===character||item.type==='rug'||(item.seatFor===animationData.id&&seatAnchor))continue;item.group.updateWorldMatrix(true,false);const transform=inverse.clone().multiply(item.group.matrixWorld);const local=new THREE.Box3();for(const x of [-item.size.x/2,item.size.x/2])for(const y of [0,item.size.y])for(const z of [-item.size.z/2,item.size.z/2])local.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(transform));const p=blob.passo;if(blob.celle.some(([x,y,z])=>(x+1)*p>=local.min.x&&x*p<=local.max.x&&(y+1)*p>=local.min.y&&y*p<=local.max.y&&(z+1)*p>=local.min.z&&z*p<=local.max.z))conflicts.push(models[item.type].label);}
  const seatMissing=animationData.richiede==='seduta'&&!items.some(i=>i.seatFor===animationData.id&&i.type==='chair');
  $('validation').textContent=(seatMissing?'Seduta obbligatoria mancante. ':'')+(conflicts.length?'Possibile conflitto con il blob: '+conflicts.join(', ')+'. Verificare in 3D.':'Nessun ostacolo nel blob approssimato. Compatibilità da verificare visivamente.');
}
$('seat-add').onclick=async()=>{try{if(!seatAnchor||!animationData)throw Error('Punto seduta non disponibile.');if(items.some(i=>i.seatFor===animationData.id))throw Error('Una seduta è già agganciata.');const item=await add('chair');item.seatFor=animationData.id;updateSeat();sync();status('Poltrona collegata al punto stimato: controlla visivamente l’altezza e il contatto.');}catch(e){status(e.message);}};
function updateSeat(){const character=items.find(i=>i.type==='character'),seat=items.find(i=>i.seatFor===animationData?.id);if(!character||!seat||!seatAnchor)return;character.group.updateWorldMatrix(true,false);const p=character.group.localToWorld(seatAnchor.clone());seat.group.position.set(p.x,p.y-seat.size.y*.5*character.scale,p.z);seat.group.rotation.y=character.group.rotation.y;seat.scale=character.scale;seat.group.scale.setScalar(seat.scale);}
$('blob-generate').onclick=async()=>{
 const character=items.find(i=>i.type==='character');if(!character||!action||!animationData)return;
 playing=false;$('play').textContent='▶ Riproduci';$('blob-generate').disabled=$('play').disabled=$('time').disabled=true;
 const g=character.group, position=g.position.clone(), rotation=g.rotation.y, scale=character.scale;
 try{clearBlob();g.position.set(0,0,0);g.rotation.y=0;g.scale.setScalar(1);scene.updateMatrixWorld(true);
   const result=await generaBlob({object:g.children[0],mixer,action,duration:animationData.duration,clip:animationData.clip,progress:(n,total)=>status(`Generazione blob: ${n}/${total} pose…`)});installBlob(result,g);
   try{memorizzaBlob(result,animationData,'Mannequin_Medium');}catch(e){console.warn('Salvataggio locale non disponibile',e);}
   $('time').value=0;$('time-label').textContent='0,00 s';status(`Blob generato: ${blob.celle.length} celle piene, passo ${blob.passo}, margine ${blob.margine}. Da verificare.`);
 }catch(e){clearBlob();status('Generazione non riuscita: '+e.message);}finally{g.position.copy(position);g.rotation.y=rotation;g.scale.setScalar(scale);scene.updateMatrixWorld(true);$('blob-generate').disabled=$('blob-open').disabled=$('play').disabled=$('time').disabled=false;validate();}
};
$('blob-visible').onchange=()=>{if(blobMesh)blobMesh.visible=$('blob-visible').checked;};
$('blob-save').onclick=()=>{if(!blob)return;const url=URL.createObjectURL(new Blob([JSON.stringify(blob)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`blob-${animationData.clip}-medium.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('blob-open').onclick=()=>$('blob-file').click();
$('blob-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const data=JSON.parse(await f.text());if(!validBlob(data))throw Error('Blob non valido o non compatibile con questa clip.');const character=items.find(i=>i.type==='character');if(!character)throw Error('Personaggio mancante.');installBlob(data,character.group);try{memorizzaBlob(data,animationData,'Mannequin_Medium');}catch(e){console.warn('Blob non salvato localmente',e);}$('blob-generate').disabled=$('blob-open').disabled=false;status(`Blob caricato: ${data.celle.length} celle. Da verificare.`);validate();}catch(err){status('Impossibile aprire il blob: '+err.message);}finally{e.target.value='';}};
$('animation').addEventListener('change',chooseAnimation);
$('event').addEventListener('change',()=>{const found=libraryAnimations.find(a=>a.evento===$('event').value);$('animation').value=found?.id||'';chooseAnimation();});
$('play').onclick=()=>{if(!action)return;playing=!playing;if(playing&&Number($('time').value)>=animationData.duration){action.reset().play();mixer.setTime(0);$('time').value=0;} $('play').textContent=playing?'⏸ Pausa':'▶ Riproduci';};
$('time').oninput=()=>{if(!mixer||!action)return;playing=false;$('play').textContent='▶ Riproduci';action.reset().play();mixer.setTime(Number($('time').value));$('time-label').textContent=Number($('time').value).toFixed(2).replace('.',',')+' s';};
async function initialize(){try{const r=await fetch('./animazioni-scena.json');if(!r.ok)throw Error('Libreria non disponibile');const data=await r.json();libraryAnimations=data.animazioni;$('animation').innerHTML='<option value="">Nessuna</option>'+libraryAnimations.map(a=>`<option value="${a.id}">${a.nome}</option>`).join('');await add('character');$('animation').value=libraryAnimations[0]?.id||'';await chooseAnimation();}catch(e){status(e.message);}}
let tasks=[], taskTag=null, taskBusy=false, jobRunning=false, jobs=[], jobsAvailable=false, jobsSignature='';
const jobLabels={in_coda:'In coda',in_esecuzione:'In esecuzione',da_verificare:'Da verificare ? solo nella copia',fallito:'Esecuzione fallita',interrotto:'Esecuzione interrotta ? esito da verificare'};
function latestJob(task){return jobs.find(j=>j.todoId===task.id);}
function taskPhase(task,job){
  if(job && ['in_coda','in_esecuzione','fallito','interrotto'].includes(job.stato)) return jobLabels[job.stato];
  if(job && task.pipeline?.lavoroId!==job.id) return jobLabels[job.stato]||'Esito da verificare';
  if(task.pipeline?.fase==='da_fare') return 'Da fare ? lavoro precedente conservato';
  if(task.pipeline?.fase==='pubblicato') return 'Pubblicato ? dichiarato manualmente';
  if(task.pipeline?.fase==='verificato') return 'Verificato ? da pubblicare';
  if(task.pipeline?.fase==='da_verificare') return 'Da verificare ? solo nella copia';
  if(job) return jobLabels[job.stato]||'Esito da verificare';
  return task.completato?'Chiuso in precedenza ? pubblicazione non verificata':'Da fare';
}
function showJob(job){$('job-status').textContent=`${jobLabels[job.stato]||job.stato} ? ${job.testo}${job.cartella?' ? Copia: '+job.cartella:''}`;$('job-output').textContent=[...(job.messaggi||[]),...(job.fileModificati?.length?['File modificati nella copia:',...job.fileModificati]:[])].join('\n');}
function renderTasks(){
 const list=$('task-list');list.replaceChildren();
 for(const task of tasks){
  const job=latestJob(task), row=document.createElement('div');row.className='task-row';
  const title=document.createElement('strong');title.textContent=`${task.tipo} ? ${task.testo}`;
  const phase=document.createElement('span');phase.className='task-phase';phase.textContent=jobsAvailable?taskPhase(task,job):'Stato esecuzione non disponibile';
  const actions=document.createElement('div');actions.className='bar task-actions';
  const run=document.createElement('button');run.type='button';run.textContent='Esegui ora';run.disabled=taskBusy||jobRunning||!taskTag||!jobsAvailable||task.completato;run.onclick=()=>startJob(task);
  const history=document.createElement('button');history.type='button';history.textContent='Dettagli lavoro';history.disabled=!job;history.onclick=()=>showJob(job);
  const select=document.createElement('select');select.setAttribute('aria-label','Stato manuale: '+task.testo);
  const current=task.pipeline?.lavoroId===(job?.id||null)?task.pipeline?.fase:null;
  select.innerHTML='<option value="">Aggiorna stato?</option><option value="da_fare">Riapri ? da fare</option><option value="da_verificare">Da verificare nella copia</option><option value="verificato">Verificato ? da pubblicare</option><option value="pubblicato">Dichiara pubblicato</option>';
  select.disabled=taskBusy||!taskTag||!jobsAvailable||!!(job&&['in_coda','in_esecuzione'].includes(job.stato));
  select.onchange=()=>{const fase=select.value;if(!fase)return;if(fase==='pubblicato'&&current!=='verificato'){alert('Prima registra la verifica del lavoro. La pubblicazione va eseguita separatamente.');select.value='';return;}if((fase==='verificato'||fase==='da_verificare')&&!job){alert('Non risulta un lavoro Sentinella associato a questo TODO.');select.value='';return;}commitTasks(tasks.map(t=>t.id===task.id?{...t,completato:fase==='pubblicato',pipeline:{fase,lavoroId:job?.id||null,aggiornato:new Date().toISOString()}}:t));};
  const remove=document.createElement('button');remove.type='button';remove.textContent='Rimuovi';remove.disabled=taskBusy||!taskTag;remove.onclick=()=>commitTasks(tasks.filter(t=>t.id!==task.id));
  actions.append(run,history,select,remove);row.append(title,phase,actions);list.append(row);
 }
 if(!tasks.length)list.textContent=taskTag?'Nessun TODO o bug.':'Registro non caricato.';
 for(const control of $('task-form').elements)control.disabled=taskBusy||!taskTag;
}
async function startJob(task){if(jobRunning)return;jobRunning=true;renderTasks();try{const r=await fetch('/api/sentinella-v0',{method:'POST',headers:{'Content-Type':'application/json','X-Sentinella-Local':'v0'},body:JSON.stringify({id:task.id})});const data=await r.json();if(!r.ok)throw Error(data.errore||`Errore ${r.status}`);$('job-status').textContent=`Avviato: ${task.testo}`;await refreshJobs();}catch(e){jobRunning=false;$('job-status').textContent='Avvio non riuscito: '+e.message;renderTasks();}}
async function refreshJobs(){try{const r=await fetch('/api/sentinella-v0',{cache:'no-store'});if(!r.ok)throw Error('Sentinella non disponibile');const data=await r.json();const signature=JSON.stringify([data.corrente,data.lavori]);const changed=signature!==jobsSignature||!jobsAvailable;jobsSignature=signature;jobsAvailable=true;jobs=data.lavori||[];jobRunning=!!data.corrente;if(changed)renderTasks();if(!jobs.length)$('job-status').textContent='Nessun lavoro registrato.';}catch(e){jobsAvailable=false;renderTasks();$('job-status').textContent='Sentinella non disponibile: '+e.message;}}
setInterval(refreshJobs,3000);refreshJobs();
async function commitTasks(next){if(taskBusy||!taskTag)return false;taskBusy=true;renderTasks();try{const r=await fetch('/api/todo-scene',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':taskTag},body:JSON.stringify({versione:1,attivita:next})});if(!r.ok)throw Error(r.status===412?'Il file è stato modificato altrove: ricarica la pagina prima di riprovare.':`salvataggio non riuscito (${r.status})`);const data=await r.json();tasks=data.attivita;taskTag=r.headers.get('ETag');$('task-status').textContent='Salvato nel file del progetto.';return true;}catch(e){$('task-status').textContent='Errore: '+e.message;return false;}finally{taskBusy=false;renderTasks();}}
async function loadTasks(){try{const r=await fetch('/api/todo-scene');if(!r.ok)throw Error(`server non aggiornato o registro non disponibile (${r.status})`);const data=await r.json();if(data.versione!==1||!Array.isArray(data.attivita))throw Error('formato non valido');tasks=data.attivita;taskTag=r.headers.get('ETag');if(!taskTag)throw Error('versione del registro non disponibile');$('task-status').textContent='Registro caricato dal progetto.';renderTasks();
  // Importa le vecchie note del browser senza cancellarle o duplicare il testo.
  try{const old=JSON.parse(localStorage.getItem('editor-scena-todo-v1')||'[]');const extra=Array.isArray(old)?old.filter(t=>t&&typeof t.text==='string'&&t.text.trim()&&['TODO','Bug'].includes(t.kind)&&!tasks.some(x=>x.testo===t.text)).map(t=>({id:crypto.randomUUID(),tipo:t.kind,testo:t.text.trim(),completato:!!t.done})):[];if(extra.length){const ok=await commitTasks([...tasks,...extra]);if(ok)$('task-status').textContent='Registro caricato; precedenti note del browser importate.';}}catch(e){console.warn('Note precedenti non importate',e);}
 }catch(e){taskTag=null;$('task-status').textContent='Registro non disponibile: '+e.message;renderTasks();}}
$('task-form').onsubmit=async e=>{e.preventDefault();const text=$('task-text').value.trim();if(!text)return;const ok=await commitTasks([...tasks,{id:crypto.randomUUID(),tipo:$('task-kind').value,testo:text,completato:false}]);if(ok)$('task-text').value='';};
async function refreshTaskChanges(){if(taskBusy||!taskTag)return;try{const r=await fetch('/api/todo-scene',{cache:'no-store'});const tag=r.headers.get('ETag');if(!r.ok||!tag||tag===taskTag)return;const data=await r.json();if(taskBusy||data.versione!==1||!Array.isArray(data.attivita))return;tasks=data.attivita;taskTag=tag;$('task-status').textContent='Registro aggiornato dal progetto.';renderTasks();}catch(e){console.warn('Aggiornamento registro non disponibile',e);}}
setInterval(refreshTaskChanges,5000);renderTasks();loadTasks();
function animate(){resize();const delta=clock.getDelta();if(mixer&&playing&&animationData){mixer.update(delta);const t=Math.min(action.time,animationData.duration);$('time').value=t;$('time-label').textContent=t.toFixed(2).replace('.',',')+' s';if(t>=animationData.duration){playing=false;$('play').textContent='▶ Riproduci';}}else if(mixer&&!animationData)mixer.update(delta);controls.update();scene.updateMatrixWorld(true);updateSeat();renderer.render(scene,camera);drawPlan();validate();requestAnimationFrame(animate);}sync();animate();initialize();
