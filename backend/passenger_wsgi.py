import os
import sys
import traceback
import mimetypes
from a2wsgi import ASGIMiddleware

# 1. Configurações de Path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# 2. Inicialização Global do Middleware (A CURA DO CARREGAMENTO INFINITO)
# Instanciar fora da função application impede que o cPanel trave os processos do Python.
try:
    from main import app as fastapi_app
    backend_app = ASGIMiddleware(fastapi_app)
except Exception as e:
    # Caso o main.py tenha erro, salvamos o erro para mostrar na tela
    backend_app = None
    startup_error = f"ERRO NA INICIALIZACAO: {str(e)}\n\n{traceback.format_exc()}"

# 3. Caminho do Frontend
STATIC_ROOT = '/home1/portald3/public_html/portaldaordem/frontend/out'

def application(environ, start_response):
    # Correção obrigatória para headers de POST no cPanel
    if environ.get('CONTENT_LENGTH') == '':
        environ['CONTENT_LENGTH'] = '0'
    if environ.get('HTTP_CONTENT_LENGTH') == '':
        environ['HTTP_CONTENT_LENGTH'] = '0'

    path = environ.get('PATH_INFO', '')

    try:
        # Roteamento da API
        if path.startswith('/api/'):
            if backend_app:
                return backend_app(environ, start_response)
            else:
                start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
                return [startup_error.encode('utf-8')]
        
        # Servir Frontend (Next.js out folder)
        cleaned_path = path.lstrip('/')
        if not cleaned_path: cleaned_path = 'index.html'
        file_path = os.path.join(STATIC_ROOT, cleaned_path)
        
        # Suporte a rotas .html e pastas
        if not os.path.exists(file_path):
            file_path = os.path.join(STATIC_ROOT, cleaned_path + '.html')
        if os.path.isdir(file_path):
            file_path = os.path.join(file_path, 'index.html')

        if os.path.exists(file_path) and os.path.isfile(file_path):
            ctype, _ = mimetypes.guess_type(file_path)
            with open(file_path, 'rb') as f:
                content = f.read()
            start_response('200 OK', [('Content-Type', ctype or 'application/octet-stream')])
            return [content]
        
        # 404 Fallback
        start_response('404 Not Found', [('Content-Type', 'text/plain')])
        return [b"Caminho nao encontrado no servidor"]

    except Exception as e:
        error_msg = f"ERRO DE EXECUCAO: {str(e)}\n\n{traceback.format_exc()}"
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [error_msg.encode('utf-8')]
