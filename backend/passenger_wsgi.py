import os
import sys
import traceback
from a2wsgi import ASGIMiddleware

# Configura o path do Python para o diretório backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# Adiciona logs de erro para podermos depurar
log_file = os.path.join(BASE_DIR, 'passenger_error.log')

def log(msg):
    with open(log_file, 'a') as f:
        f.write(f"[WSGI LOG] {msg}\n")

try:
    from main import app as fastapi_app
    log("FastAPI carregado com sucesso.")
except Exception as e:
    log(f"Erro ao carregar FastAPI: {e}")
    fastapi_app = None

def serve_static(environ, start_response):
    import mimetypes
    path = environ.get('PATH_INFO', '/').lstrip('/')
    if not path: path = 'index.html'
    
    # PASTA ONDE ESTÁ O SEU FRONTEND (OUT)
    static_root = '/home1/portald3/public_html/portaldaordem/frontend/out'
    file_path = os.path.join(static_root, path)
    
    # Suporte a rotas limpas do Next.js
    if not os.path.exists(file_path):
         file_path = os.path.join(static_root, path + '.html')
    if os.path.isdir(file_path):
         file_path = os.path.join(file_path, 'index.html')

    if os.path.exists(file_path) and os.path.isfile(file_path):
        ctype, _ = mimetypes.guess_type(file_path)
        with open(file_path, 'rb') as f:
            content = f.read()
        start_response('200 OK', [('Content-Type', ctype or 'application/octet-stream')])
        return [content]
    
    start_response('404 Not Found', [('Content-Type', 'text/plain')])
    return [b"Arquivo nao encontrado"]

def application(environ, start_response):
    path = environ.get('PATH_INFO', '')
    if path.startswith('/api/'):
        return ASGIMiddleware(fastapi_app)(environ, start_response)
    return serve_static(environ, start_response)
