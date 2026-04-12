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

# Mount static files for receipts
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"status": "Sistema Online"}
