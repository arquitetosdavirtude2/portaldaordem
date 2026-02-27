import os
import sys
import traceback
import mimetypes

# Adiciona o diretório atual ao path do Python
sys.path.insert(0, os.path.dirname(__file__))

log_path = os.path.join(os.path.dirname(__file__), 'passenger_error.log')

def log(msg):
    with open(log_path, 'a') as f:
        f.write(msg + "\n")

# Caminho absoluto para os arquivos estáticos do frontend em public_html
STATIC_DIR = '/home1/portald3/public_html/portaldaordem'
log(f"[startup] STATIC_DIR = {STATIC_DIR}")
log(f"[startup] STATIC_DIR exists = {os.path.exists(STATIC_DIR)}")

# --- APP FastAPI (para /api/) ---
api_app = None
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    log(f"[startup] DATABASE_URL = {os.getenv('DATABASE_URL', 'NAO DEFINIDA')[:60]}")
    
    from main import app as fastapi_app
    from a2wsgi import ASGIMiddleware
    api_app = ASGIMiddleware(fastapi_app)
    log("[startup] FastAPI carregado com sucesso")
except Exception as e:
    log(f"[ERRO] FastAPI nao carregou: {str(e)}")
    log(traceback.format_exc())

def serve_static(environ, start_response):
    """Serve arquivos estáticos do frontend/out/"""
    path = environ.get('PATH_INFO', '/').lstrip('/')
    
    # Rota padrão ou rota sem extensão -> tenta servir .html
    if not path:
        path = 'index.html'
    
    file_path = os.path.join(STATIC_DIR, path)
    
    # Se não tem extensão, tenta como .html (Next.js static export)
    if not os.path.exists(file_path) and '.' not in os.path.basename(path):
        file_path = os.path.join(STATIC_DIR, path + '.html')
    
    # Tenta index.html dentro de subpasta
    if os.path.isdir(file_path):
        file_path = os.path.join(file_path, 'index.html')
    
    if os.path.isfile(file_path):
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        with open(file_path, 'rb') as f:
            content = f.read()
        
        start_response('200 OK', [
            ('Content-Type', content_type),
            ('Content-Length', str(len(content))),
        ])
        return [content]
    
    # 404
    msg = b"404 Not Found"
    start_response('404 Not Found', [('Content-Type', 'text/plain'), ('Content-Length', str(len(msg)))])
    return [msg]

def application(environ, start_response):
    """Router principal: /api/ vai para FastAPI, o resto serve estático."""
    path = environ.get('PATH_INFO', '/')
    method = environ.get('REQUEST_METHOD', 'GET')
    
    if path.startswith('/api/'):
        log(f"[API] Req WSGI Recebida: {method} {path}")
        
        if path == '/api/ping-wsgi':
            msg = b'{"status": "WSGI Direto Funciona!"}'
            start_response('200 OK', [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(msg))),
            ])
            return [msg]
            
        if api_app:
            return api_app(environ, start_response)
        else:
            msg = b'{"erro": "Backend API indisponivel. Verifique passenger_error.log"}'
            start_response('503 Service Unavailable', [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(msg))),
            ])
            return [msg]
    else:
        return serve_static(environ, start_response)

log("[startup] Passenger app iniciado com sucesso")
