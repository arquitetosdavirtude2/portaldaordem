import os
import sys
import json
import mimetypes
import traceback
import pymysql

# 1. Configurações de Path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# 2. Configurações de Banco (Mapeadas direto de database.py)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'portald3_user',
    'password': 'gWh28%40dGcMp',
    'database': 'portald3_gomb',
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def handle_direct_login(environ, start_response):
    """
    Processa o login SEM passar pelo FastAPI/ASGI.
    Isso é 100% à prova de travamentos no cPanel.
    """
    try:
        # Lê o corpo do POST (Login e Senha do Frontend)
        length = int(environ.get('CONTENT_LENGTH', '0'))
        body = environ['wsgi.input'].read(length)
        data = json.loads(body.decode('utf-8'))
        
        login_input = str(data.get('login', '')).strip().lower()
        senha_input = str(data.get('senha', ''))

        # A: Bypass MASTER (Acesso de Emergência)
        if login_input.upper() == "MASTER" and senha_input == "GOMB2024":
            response = {
                "success": True, 
                "tipo": "master", 
                "role": "admin", 
                "allowed_states": ["*"], 
                "nome": "Grão-Mestre (Recuperação)", 
                "cargo": "Administrador"
            }
            return send_json_response(response, start_response)

        # B: Consulta Direta ao MySQL (Nilton, Elias, etc)
        conn = pymysql.connect(**DB_CONFIG)
        try:
            with conn.cursor() as cursor:
                sql = "SELECT id, login, senha, role, nome, loja_id FROM usuarios WHERE LOWER(login) = %s"
                cursor.execute(sql, (login_input,))
                user = cursor.fetchone()
                
                if user and user['senha'] == senha_input:
                    # Normalização de papel para o Frontend
                    role = user['role']
                    if role == "Estadual": role = "mestre"
                    
                    response = {
                        "success": True,
                        "role": role,
                        "nome": user.get('nome', 'Irmão').strip(),
                        "loja_id": user.get('loja_id'),
                        "allowed_states": ["*"] if role == 'admin' or user['role'] == 'Federal' else []
                    }
                    return send_json_response(response, start_response)
                
                return send_json_response({"success": False, "message": "Usuário ou senha incorretos"}, start_response)
        finally:
            conn.close()
            
    except Exception as e:
        return send_json_response({"success": False, "message": f"Erro interno: {str(e)}"}, start_response)

def send_json_response(data, start_response):
    body = json.dumps(data).encode('utf-8')
    start_response('200 OK', [
        ('Content-Type', 'application/json'),
        ('Content-Length', str(len(body))),
        ('Access-Control-Allow-Origin', '*'),
        ('Access-Control-Allow-Methods', 'POST, OPTIONS'),
        ('Access-Control-Allow-Headers', 'Content-Type')
    ])
    return [body]

# 3. Importação do Backend Principal (para outras rotas)
try:
    from a2wsgi import ASGIMiddleware
    from main import app as fastapi_app
    # Instanciamos UMA VEZ no escopo global para evitar deadlocks
    backend_app = ASGIMiddleware(fastapi_app)
except:
    backend_app = None

def application(environ, start_response):
    path = environ.get('PATH_INFO', '')
    method = environ.get('REQUEST_METHOD', 'GET')

    # Correção para Passenger/WSGI
    if environ.get('CONTENT_LENGTH') == '':
        environ['CONTENT_LENGTH'] = '0'

    # INTERCEPTOR DE LOGIN: A cura definitiva para o carregamento infinito
    if path == '/api/auth/login/':
        if method == 'OPTIONS': # Handle CORS preflight
            start_response('200 OK', [
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'POST, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type')
            ])
            return [b""]
        return handle_direct_login(environ, start_response)

    # SERVIÇO DE FRONTEND (Static Files)
    STATIC_ROOT = '/home1/portald3/public_html/portaldaordem/frontend/out'
    cleaned_path = path.lstrip('/')
    if not cleaned_path: cleaned_path = 'index.html'
    
    potential_files = [
        os.path.join(STATIC_ROOT, cleaned_path),
        os.path.join(STATIC_ROOT, cleaned_path + '.html'),
        os.path.join(STATIC_ROOT, cleaned_path, 'index.html')
    ]
    
    for f_path in potential_files:
        if os.path.exists(f_path) and os.path.isfile(f_path):
            ctype, _ = mimetypes.guess_type(f_path)
            with open(f_path, 'rb') as f:
                content = f.read()
            start_response('200 OK', [('Content-Type', ctype or 'text/html'), ('Access-Control-Allow-Origin', '*')])
            return [content]

    # FALLBACK PARA O BACKEND (Tesouraria, etc)
    if backend_app:
        return backend_app(environ, start_response)

    start_response('404 Not Found', [('Content-Type', 'text/plain')])
    return [b"Caminho nao encontrado"]
