import os
import sys
import traceback
from a2wsgi import ASGIMiddleware

# 1. Configuração de Diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
log_file = os.path.join(BASE_DIR, 'passenger_error.log')

def log(msg):
    with open(log_file, 'a') as f:
        f.write(f"[WSGI] {msg}\n")

# 2. Inicialização ÚNICA (Fora da função principal para evitar Deadlock)
application = None
try:
    from main import app as fastapi_app
    # Criamos a ponte WSGI uma única vez no startup do processo
    wsgi_app = ASGIMiddleware(fastapi_app)
    log("Backend FastAPI carregado com sucesso.")
except Exception as e:
    log(f"ERRO CRÍTICO NO STARTUP: {e}")
    log(traceback.format_exc())
    wsgi_app = None

def serve_static(environ, start_response):
    import mimetypes
    path = environ.get('PATH_INFO', '/').lstrip('/')
    if not path: path = 'index.html'
    
    # Caminho absoluto para o frontend/out
    static_root = '/home1/portald3/public_html/portaldaordem/frontend/out'
    file_path = os.path.join(static_root, path)
    
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
    return [b"Arquivo nao encontrado no frontend/out"]

def application(environ, start_response):
    # Correção obrigatória para POST no cPanel/Passenger
    if environ.get('CONTENT_LENGTH') == '':
        environ['CONTENT_LENGTH'] = '0'
    if environ.get('HTTP_CONTENT_LENGTH') == '':
        environ['HTTP_CONTENT_LENGTH'] = '0'

    path = environ.get('PATH_INFO', '')
    
    # Roteamento
    if path.startswith('/api/'):
        if wsgi_app:
            return wsgi_app(environ, start_response)
        else:
            start_response('503 Service Unavailable', [('Content-Type', 'text/plain')])
            return [b"Backend indisponivel. Veja o log."]
            
    return serve_static(environ, start_response)
