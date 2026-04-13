from sqlalchemy import create_all, text
from database import engine, Base
import models # Ensure all models are registered

def run_fix():
    print("--- INICIANDO CORREÇÃO DE BANCO MYSQL ---")
    
    with engine.connect() as conn:
        # 1. Adicionar loja_id em usuarios
        try:
            print("Tentando adicionar coluna 'loja_id' na tabela 'usuarios'...")
            conn.execute(text("ALTER TABLE usuarios ADD COLUMN loja_id INT NULL;"))
            conn.commit()
            print("[SUCESSO] Coluna loja_id adicionada.")
        except Exception as e:
            if "Duplicate column name" in str(e) or "1060" in str(e):
                print("[INFO] Coluna loja_id já existe.")
            else:
                print(f"[ERRO] Falha ao adicionar loja_id: {e}")

        # 2. Adicionar rito em lojas
        try:
            print("Tentando adicionar coluna 'rito' na tabela 'lojas'...")
            conn.execute(text("ALTER TABLE lojas ADD COLUMN rito VARCHAR(50) NULL;"))
            conn.commit()
            print("[SUCESSO] Coluna rito adicionada.")
        except Exception as e:
            if "Duplicate column name" in str(e) or "1060" in str(e):
                print("[INFO] Coluna rito já existe.")
            else:
                print(f"[ERRO] Falha ao adicionar rito: {e}")

        # 3. Criar outras tabelas (Caixas, Transacoes, etc) se não existirem
        try:
            print("Criando novas tabelas de Tesouraria se necessário...")
            Base.metadata.create_all(engine)
            print("[SUCESSO] Tabelas sincronizadas.")
        except Exception as e:
            print(f"[ERRO] Falha ao sincronizar tabelas: {e}")

    print("--- CORREÇÃO FINALIZADA ---")

if __name__ == "__main__":
    run_fix()
