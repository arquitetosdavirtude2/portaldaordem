import os
import sys
import traceback

# Adiciona o diretório atual ao path do Python
sys.path.insert(0, os.path.dirname(__file__))

log_path = os.path.join(os.path.dirname(__file__), 'passenger_error.log')

def log(msg):
    with open(log_path, 'a') as f:
        f.write(msg + "\n")

try:
    # Carrega variáveis de ambiente antes de importar a aplicação
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

    log(f"[startup] DATABASE_URL = {os.getenv('DATABASE_URL', 'NAO DEFINIDA')[:60]}")

    # Testa conexão com o banco ANTES de iniciar o app completo
    from sqlalchemy import create_engine, text
    import os as _os
    _url = _os.getenv("DATABASE_URL", "sqlite:///./database.db")
    _args = {"connect_timeout": 5} if "mysql" in _url else {}
    _engine = create_engine(_url, connect_args=_args, pool_timeout=5)
    with _engine.connect() as _conn:
        _conn.execute(text("SELECT 1"))
    log("[startup] Conexão com DB OK")

    # Importa a aplicação FastAPI
    from main import app

    # Importa a2wsgi para converter ASGI (FastAPI) para WSGI (Passenger)
    from a2wsgi import ASGIMiddleware

    # Cria a aplicação WSGI
    application = ASGIMiddleware(app)
    log("[startup] Passenger app iniciado com sucesso")

except Exception as e:
    log(f"[ERRO FATAL] {str(e)}")
    log(traceback.format_exc())

    def application(environ, start_response):
        start_response('500 Internal Server Error', [('Content-type', 'text/plain; charset=utf-8')])
        msg = f"Erro interno: {str(e)}\nVerifique passenger_error.log para detalhes."
        return [msg.encode('utf-8')]
