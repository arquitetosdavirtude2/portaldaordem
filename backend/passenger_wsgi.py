import os
import sys
import traceback
import mimetypes

# Diagnóstico de Dependências (Para resolver o Erro 500)
dep_error = None
try:
    import fastapi
    import sqlalchemy
    import a2wsgi
    import pymysql
    import dotenv
except ImportError as e:
    dep_error = f"ERRO DE BIBLIOTECA: Faltando '{e.name}'. Por favor, instale-a no cPanel (Setup Python App -> Configuration File -> pip install)."

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

# Global error storage
startup_error = None

def get_api_app():
    global api_app, asgi_initialized, startup_error
    if not asgi_initialized:
        try:
            from dotenv import load_dotenv
            # Mesma lógica robusta do database.py
            possible_paths = [
                "/home1/portald3/public_html/portaldaordem/backend/.env", 
                os.path.join(BASE_DIR, '.env'),
                ".env"
            ]
            for p in possible_paths:
                if os.path.exists(p):
                    load_dotenv(p, override=True)
                    log(f"[startup] .env carregado de {p}")
                    break
            
            from main import app as fastapi_app
            from a2wsgi import ASGIMiddleware
            
            # Instancia o adaptador ASGI -> WSGI somente AQUI dentro do worker forked
            api_app = ASGIMiddleware(fastapi_app)
            log("[startup] FastAPI/ASGI Middleware carregado c/ sucesso")
        except Exception as e:
            startup_error = f"FALHA NO STARTUP: {str(e)}\n{traceback.format_exc()}"
            log(startup_error)
        finally:
            asgi_initialized = True
            
    return api_app

# ... (serve_static remains same) ...

def application(environ, start_response):
    """Router principal: /api/ vai para FastAPI, o resto serve estático."""
    # Se houve erro de biblioteca na inicialização, mostra na tela
    if dep_error:
         start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
         return [dep_error.encode()]

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
            # Se a API falhou, mostra o erro de inicialização em vez de um JSON genérico
            error_msg = f"ERRO 503 - API NAO CARREGOU.\n\nDetalhes:\n{startup_error or 'Erro desconhecido'}"
            start_response('503 Service Unavailable', [
                ('Content-Type', 'text/plain'),
                ('Content-Length', str(len(error_msg))),
            ])
            return [error_msg.encode()]
    else:
        return serve_static(environ, start_response)
    else:
        return serve_static(environ, start_response)

log("[startup] Passenger app iniciado com sucesso")
