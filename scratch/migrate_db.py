from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        print("Verificando colunas da tabela 'pessoas'...")
        # Adicionar tipo_pessoa
        try:
            conn.execute(text("ALTER TABLE pessoas ADD COLUMN tipo_pessoa VARCHAR(50) DEFAULT 'obreiro'"))
            conn.commit()
            print("Coluna 'tipo_pessoa' adicionada.")
        except Exception as e:
            print(f"Aviso: {e}")

        # Adicionar motivo_adormecimento
        try:
            conn.execute(text("ALTER TABLE pessoas ADD COLUMN motivo_adormecimento TEXT"))
            conn.commit()
            print("Coluna 'motivo_adormecimento' adicionada.")
        except Exception as e:
            print(f"Aviso: {e}")

        # Adicionar data_iniciacao
        try:
            conn.execute(text("ALTER TABLE pessoas ADD COLUMN data_iniciacao VARCHAR(10)"))
            conn.commit()
            print("Coluna 'data_iniciacao' adicionada.")
        except Exception as e:
            print(f"Aviso: {e}")

        # Corrigir nulos para tipo_pessoa
        try:
            conn.execute(text("UPDATE pessoas SET tipo_pessoa = 'obreiro' WHERE tipo_pessoa IS NULL"))
            conn.commit()
            print("tipo_pessoa atualizado para 'obreiro' onde estava nulo.")
        except Exception as e:
            print(f"Erro ao atualizar: {e}")

if __name__ == "__main__":
    migrate()
