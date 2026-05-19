from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles
from routes import auth, pessoas, admin, lojas, tesouraria, academia, trabalhos
from database import engine
from sqlalchemy import text

# Migração Automática: Garante que novas colunas e tabelas existam no banco de dados
def run_safe_migrations(engine_ref):
    """Executa migrações aditivas seguras — ADD COLUMN e CREATE TABLE.
    Cada operação é individual para que falhas não afetem as demais."""
    
    migrations = [
        # --- ConteudoEstudo ---
        "ALTER TABLE conteudos_estudo ADD COLUMN descricao_jornada TEXT",
        "ALTER TABLE conteudos_estudo ADD COLUMN ativo INTEGER DEFAULT 1",
        
        # --- MaterialEstudo ---
        "ALTER TABLE materiais_estudo ADD COLUMN titulo VARCHAR(200)",
        "ALTER TABLE materiais_estudo ADD COLUMN descricao VARCHAR(500)",
        "ALTER TABLE materiais_estudo ADD COLUMN ordem INTEGER DEFAULT 0",
        "ALTER TABLE materiais_estudo ADD COLUMN duracao_segundos INTEGER",
        
        # --- Quiz ---
        "ALTER TABLE quizzes ADD COLUMN tipo VARCHAR(30) DEFAULT 'livre'",
        "ALTER TABLE quizzes ADD COLUMN ordem INTEGER DEFAULT 0",
        
        # --- ProgressoEstudo ---
        "ALTER TABLE progresso_estudo ADD COLUMN nota FLOAT",
        
        # --- EntregaTrabalho ---
        "ALTER TABLE entregas_trabalho ADD COLUMN corrigido_por INTEGER",
        "ALTER TABLE entregas_trabalho ADD COLUMN data_correcao VARCHAR(30)",
    ]
    
    new_tables = [
        """CREATE TABLE IF NOT EXISTS respostas_quiz (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            pessoa_id INTEGER,
            quiz_id INTEGER,
            conteudo_id INTEGER,
            resposta_texto TEXT,
            opcao_selecionada INTEGER,
            lacunas_json VARCHAR(2000),
            is_correto INTEGER,
            nota FLOAT,
            feedback VARCHAR(2000),
            status VARCHAR(50) DEFAULT 'pendente',
            corrigido_por INTEGER,
            data_resposta VARCHAR(30),
            data_correcao VARCHAR(30),
            UNIQUE KEY uq_resposta_pessoa_quiz (pessoa_id, quiz_id)
        )""",
        """CREATE TABLE IF NOT EXISTS progresso_material (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            pessoa_id INTEGER,
            material_id INTEGER,
            max_segundos_assistidos INTEGER DEFAULT 0,
            progresso_percentual INTEGER DEFAULT 0,
            concluido INTEGER DEFAULT 0,
            data_conclusao VARCHAR(30),
            UNIQUE KEY uq_progresso_pessoa_material (pessoa_id, material_id)
        )"""
    ]
    
    with engine_ref.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass
        
        for sql in new_tables:
            try:
                # Para SQLite, trocar AUTO_INCREMENT por AUTOINCREMENT
                if "sqlite" in str(engine_ref.url):
                    sql = sql.replace("AUTO_INCREMENT", "AUTOINCREMENT")
                    sql = sql.replace("UNIQUE KEY uq_resposta_pessoa_quiz (pessoa_id, quiz_id)", "UNIQUE (pessoa_id, quiz_id)")
                    sql = sql.replace("UNIQUE KEY uq_progresso_pessoa_material (pessoa_id, material_id)", "UNIQUE (pessoa_id, material_id)")
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass

try:
    run_safe_migrations(engine)
    print("Database Migration: Fase 1 — Migrações executadas com sucesso.")
except Exception as e:
    print(f"Database Migration: Aviso — {str(e)}")

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
