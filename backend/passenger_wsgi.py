import os
import sys

# Adiciona o diretório atual ao path do Python
sys.path.insert(0, os.path.dirname(__file__))

# Carrega variáveis de ambiente antes de importar a aplicação
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Importa a aplicação FastAPI
from main import app

# Importa a2wsgi para converter ASGI (FastAPI) para WSGI (Passenger)
from a2wsgi import ASGIMiddleware

# Cria a aplicação WSGI
application = ASGIMiddleware(app)
