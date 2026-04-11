import sys
import os

# Adiciona o diretório atual ao path para importar database e models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from database import engine, SessionLocal
from models import Base, Cargo, Caixa, Loja

def run_migration():
    print("--- INICIANDO AUTO-MIGRAÇÃO DE PRODUÇÃO ---")
    
    # 1. Criar tabelas que não existem
    print("Verificando novas tabelas...")
    Base.metadata.create_all(bind=engine)
    print("Tabelas verificadas/criadas.")

    # 2. Verificar colunas faltantes em tabelas existentes (Migração manual para colunas)
    inspector = inspect(engine)
    with engine.connect() as conn:
        # Colunas na tabela 'pessoas'
        columns_pessoas = [c['name'] for c in inspector.get_columns('pessoas')]
        
        new_cols = {
            "loja_id": "INT DEFAULT NULL",
            "cargo_id": "INT DEFAULT NULL",
            "login": "VARCHAR(100) DEFAULT NULL",
            "senha": "VARCHAR(100) DEFAULT NULL",
            "data_admissao": "VARCHAR(20) DEFAULT NULL"
        }
        
        for col, definition in new_cols.items():
            if col not in columns_pessoas:
                print(f"Adicionando coluna {col} em 'pessoas'...")
                conn.execute(text(f"ALTER TABLE pessoas ADD COLUMN {col} {definition}"))
        
        # Coluna 'rito' em 'lojas'
        columns_lojas = [c['name'] for c in inspector.get_columns('lojas')]
        if 'rito' not in columns_lojas:
            print("Adicionando coluna 'rito' em 'lojas'...")
            conn.execute(text("ALTER TABLE lojas ADD COLUMN rito VARCHAR(50) DEFAULT NULL"))

        # Coluna 'isento_contribuicao' em 'cargos'
        columns_cargos = [c['name'] for c in inspector.get_columns('cargos')]
        if 'isento_contribuicao' not in columns_cargos:
            print("Adicionando coluna 'isento_contribuicao' em 'cargos'...")
            conn.execute(text("ALTER TABLE cargos ADD COLUMN isento_contribuicao INT DEFAULT 0"))

        conn.commit()

    # 3. Popular dados iniciais
    db = SessionLocal()
    try:
        # Cargos Padrão
        cargos_default = [
            ("Venerável Mestre", 1),
            ("1º Vigilante", 1),
            ("2º Vigilante", 1),
            ("Secretário", 0),
            ("Tesoureiro", 0),
            ("Chanceler", 0),
            ("Mestre de Cerimônias", 0),
            ("Hospitaleiro", 0),
            ("Orador", 0)
        ]
        
        for nome, isento in cargos_default:
            exists = db.query(Cargo).filter(Cargo.nome == nome).first()
            if not exists:
                print(f"Cadastrando cargo: {nome}")
                db.add(Cargo(nome=nome, isento_contribuicao=isento))
        
        db.commit()

        # Criar Caixa Geral para cada Loja se não existir
        lojas = db.query(Loja).all()
        for loja in lojas:
            caixa_exists = db.query(Caixa).filter(Caixa.loja_id == loja.id, Caixa.tipo == 'geral').first()
            if not caixa_exists:
                print(f"Criando Caixa Geral para Loja {loja.nome}")
                db.add(Caixa(
                    loja_id=loja.id,
                    nome="Tesouraria Geral",
                    tipo="geral",
                    descricao="Caixa principal da Loja para mensalidades e despesas gerais",
                    saldo_atual=0.0
                ))
        
        db.commit()
        print("--- MIGRAÇÃO CONCLUÍDA COM SUCESSO ---")

    except Exception as e:
        print(f"ERRO DURANTE MIGRAÇÃO: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
