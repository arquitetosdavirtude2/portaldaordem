from sqlalchemy import text
from database import engine

def update():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE transacoes ADD COLUMN recorrencia VARCHAR(50) DEFAULT 'nenhuma'"))
            conn.commit()
            print("Coluna 'recorrencia' adicionada com sucesso no MySQL!")
    except Exception as e:
        print(f"Erro ou coluna ja existe: {e}")

if __name__ == "__main__":
    update()
