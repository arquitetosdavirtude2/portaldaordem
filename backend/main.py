from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles
from routes import auth, pessoas, admin, lojas, tesouraria
from database import engine

app = FastAPI(title="Sistema Mapa Estados")

# Libera o frontend acessar a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
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

# Mount static files for receipts
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"status": "API root funcionando! (Async route)"}

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
