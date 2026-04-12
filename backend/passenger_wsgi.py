import os
import sys
import traceback

# 1. Configuração de Diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

def application(environ, start_response):
    # Correção obrigatória para POST no cPanel (Fim do Infinite Loading)
    if environ.get('CONTENT_LENGTH') == '':
        environ['CONTENT_LENGTH'] = '0'
    if environ.get('HTTP_CONTENT_LENGTH') == '':
        environ['HTTP_CONTENT_LENGTH'] = '0'

    path = environ.get('PATH_INFO', '')

    try:
        # Se for API, tentamos carregar o backend e a2wsgi
        if path.startswith('/api/'):
            from a2wsgi import ASGIMiddleware
            from main import app as fastapi_app
            return ASGIMiddleware(fastapi_app)(environ, start_response)
        
        # Se for estático, servimos do Next.js
        import mimetypes
        static_root = '/home1/portald3/public_html/portaldaordem/frontend/out'
        cleaned_path = path.lstrip('/')
        if not cleaned_path: cleaned_path = 'index.html'
        file_path = os.path.join(static_root, cleaned_path)
        
        if not os.path.exists(file_path):
             file_path = os.path.join(static_root, cleaned_path + '.html')
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

    except Exception as e:
        # ISSO VAI ESCREVER O ERRO NA TELA DO SITE PARA RESOLVERMOS
        error_msg = f"ERRO DETECTADO: {str(e)}\n\n{traceback.format_exc()}"
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [error_msg.encode('utf-8')]
