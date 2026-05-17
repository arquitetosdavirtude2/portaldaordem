from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles
from routes import auth, pessoas, admin, lojas, tesouraria, academia, trabalhos
from database import engine
from sqlalchemy import text

# Migração Automática: Garante que a coluna descricao_jornada exista no banco de dados
try:
    with engine.connect() as conn:
        conn.execute(text('ALTER TABLE conteudos_estudo ADD COLUMN descricao_jornada TEXT'))
        conn.commit()
        print("Database Migration: Coluna 'descricao_jornada' criada com sucesso.")
except Exception as e:
    # A coluna já existe ou a tabela ainda não foi criada, podemos seguir adiante de forma segura
    pass

app = FastAPI(title="Sistema Mapa Estados")

# Libera o frontend acessar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Rotas
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(pessoas.router, prefix="/api/pessoas", tags=["Pessoas"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(lojas.router, prefix="/api/lojas", tags=["Lojas"])
app.include_router(tesouraria.router, prefix="/api/tesouraria", tags=["Tesouraria"])
app.include_router(academia.router, tags=["Academia"])
app.include_router(trabalhos.router, tags=["Trabalhos"])

# Mount static files for receipts and works
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"status": "API root funcionando! (Async route)"}

@app.get("/api/health-check")
def health_check():
    import os
    from database import DATABASE_URL, BASE_DIR, ENV_PATH
    
    env_exists = os.path.exists(ENV_PATH)
    env_readable = os.access(ENV_PATH, os.R_OK) if env_exists else False
    db_type = "mysql" if "mysql" in DATABASE_URL.lower() else "sqlite"
    
    return {
        "status": "online",
        "active_db": db_type,
        "env_file": {"exists": env_exists, "readable": env_readable}
    }

@app.get("/api/ping-fastapi-sync")
def ping_fastapi_sync():
    """Se esta rota der looping, o threadpool (anyio) do FastAPI está quebrado no cPanel."""
    return {"status": "Sync ping success"}

@app.get("/api/ping-fastapi-async")
async def ping_fastapi_async():
    """Se esta rota funcionar enquanto a sync trava, a culpa é 100% do Passenger."""
    return {"status": "Async ping success"}

@app.get("/api/ping-db-sync")
def ping_db_sync():
    try:
        with engine.connect() as conn:
            conn.execute(__import__('sqlalchemy').text("SELECT 1"))
        return {"db": "ok", "tipo": "sync"}
    except Exception as e:
        return {"db": "erro", "mensagem": str(e)}

@app.get("/api/ping-db-async")
async def ping_db_async():
    try:
        with engine.connect() as conn:
            conn.execute(__import__('sqlalchemy').text("SELECT 1"))
        return {"db": "ok", "tipo": "async"}
    except Exception as e:
        return {"db": "erro", "mensagem": str(e)}
