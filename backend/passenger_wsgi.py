import os
import sys
import traceback

# Adiciona o diretório atual ao path do Python
sys.path.insert(0, os.path.dirname(__file__))

try:
    # Carrega variáveis de ambiente antes de importar a aplicação
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
    
    # Importa a aplicação FastAPI
    from main import app
    
    # Importa a2wsgi para converter ASGI (FastAPI) para WSGI (Passenger)
    from a2wsgi import ASGIMiddleware
    
    # Cria a aplicação WSGI
    application = ASGIMiddleware(app)
except Exception as e:
    # Escreve o erro num arquivo log para podermos diagnosticar no cPanel
    log_path = os.path.join(os.path.dirname(__file__), 'passenger_error.log')
    with open(log_path, 'a') as f:
        f.write(f"Erro de inicializacao: {str(e)}\n\n")
        traceback.print_exc(file=f)
    
    # Raise novamente para que o Passenger saiba que falhou, 
    # ou cria um app fallback para mostrar o erro na tela.
    def application(environ, start_response):
        start_response('500 Internal Server Error', [('Content-type', 'text/plain')])
        return [b"Erro interno no Python. Verifique passenger_error.log"]
