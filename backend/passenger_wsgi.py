import os
import sys
import traceback
import mimetypes

# Caminho Base Absoluto
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)

log_path = os.path.join(BASE_DIR, 'passenger_error.log')

def log(msg):
    try:
        with open(log_path, 'a') as f:
            f.write(msg + "\n")
    except:
        pass # Silently fail if log is unwritable

# Caminho absoluto para os arquivos estáticos do frontend em public_html
STATIC_DIR = '/home1/portald3/public_html/portaldaordem/frontend/out'
log(f"[startup] STATIC_DIR = {STATIC_DIR}")
log(f"[startup] STATIC_DIR exists = {os.path.exists(STATIC_DIR)}")

# --- APP FastAPI (para /api/) ---
# [FORCE RESTART] Last Deploy: 2026-04-12 21:18 (Fixed Multi-DB Path)
api_app = None
asgi_initialized = False

def get_api_app():
    global api_app, asgi_initialized
    if not asgi_initialized:
        try:
            from dotenv import load_dotenv
            env_file = os.path.join(BASE_DIR, '.env')
            load_dotenv(env_file, override=True)
            log(f"[startup] .env carregado de {env_file}")
            
            from main import app as fastapi_app
            from a2wsgi import ASGIMiddleware
            
            # Instancia o adaptador ASGI -> WSGI somente AQUI dentro do worker forked
            api_app = ASGIMiddleware(fastapi_app)
            log("[startup] FastAPI/ASGI Middleware carregado c/ sucesso dentro do worker process")
        except Exception as e:
            log(f"[ERRO] FastAPI/ASGI nao carregou no worker: {str(e)}")
            log(traceback.format_exc())
        finally:
            asgi_initialized = True
            
    return api_app

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
    
    # Correção crítica para cPanel/Passenger: Headers com string vazia travam requisições HTTP para o a2wsgi (loop infinito)
    if environ.get('CONTENT_LENGTH') == '':
        environ['CONTENT_LENGTH'] = '0'
    if environ.get('HTTP_CONTENT_LENGTH') == '':
        environ['HTTP_CONTENT_LENGTH'] = '0'
    
    if path.startswith('/api/'):
        log(f"[API] Req WSGI Recebida: {method} {path}")
        
        if path == '/api/ping-wsgi':
            msg = b'{"status": "WSGI Direto Funciona!"}'
            start_response('200 OK', [
                ('Content-Type', 'application/json'),
                ('Content-Length', str(len(msg))),
            ])
            return [msg]
            
        app_instance = get_api_app()
        if app_instance:
            return app_instance(environ, start_response)
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
