from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, pessoas, admin
from database import engine

app = FastAPI(title="Sistema Mapa Estados")

# Libera o frontend acessar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, colocar o domínio específico
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(pessoas.router, prefix="/api/pessoas", tags=["Pessoas"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/")
def root():
    return {"status": "API funcionando!"}

@app.get("/api/ping-db")
def ping_db():
    """Endpoint de diagnóstico: testa a conexão com o banco de dados."""
    try:
        with engine.connect() as conn:
            conn.execute(__import__('sqlalchemy').text("SELECT 1"))
        return {"db": "ok", "mensagem": "Conexão com o banco de dados bem-sucedida!"}
    except Exception as e:
        return {"db": "erro", "mensagem": str(e)}
