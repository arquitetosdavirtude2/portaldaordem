import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Absolute Path for .env
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "backend", ".env")
load_dotenv(ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERRO: DATABASE_URL não encontrada no .env")
    exit(1)

engine = create_engine(DATABASE_URL)

members = [
    (1, 1, 'Elias', '111', 'elias@gomb.com', '123', 'Aprendiz', 1, 'Membro', '2024-01-01'),
    (2, 1, 'João', '222', 'joao@gomb.com', '123', 'Companheiro', 1, 'Membro', '2024-01-01'),
    (3, 1, 'Paulo Junior', '333', 'paulo@gomb.com', '123', 'Mestre', 1, 'Membro', '2024-01-01')
]

with engine.connect() as conn:
    print("Iniciando restauração de obreiros no MySQL...")
    for m in members:
        try:
            query = text("""
                INSERT INTO pessoas (id, loja_id, nome, cpf, email, senha, grau, status_id, cargo, data_admissao)
                VALUES (:id, :lid, :nome, :cpf, :email, :senha, :grau, :sid, :cargo, :data)
                ON DUPLICATE KEY UPDATE nome = VALUES(nome)
            """)
            conn.execute(query, {
                "id": m[0], "lid": m[1], "nome": m[2], "cpf": m[3],
                "email": m[4], "senha": m[5], "grau": m[6], "sid": m[7],
                "cargo": m[8], "data": m[9]
            })
            print(f"Obreiro {m[2]} restaurado.")
        except Exception as e:
            print(f"Erro ao restaurar {m[2]}: {e}")
    conn.commit()
    print("Restauração concluída.")
