# Server locale del laboratorio: come «python -m http.server», ma chiede al browser di non tenere copie dei file,
# così dopo una modifica basta ricaricare la pagina. Uso: python serve.py [porta]  (predefinita 8765)
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
handler = partial(NoCache, directory=str(Path(__file__).parent))
print(f'Laboratorio su http://localhost:{port}/')
ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
