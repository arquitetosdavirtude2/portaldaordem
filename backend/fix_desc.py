from database import SessionLocal
from sqlalchemy import text

def fix_descriptions():
    db = SessionLocal()
    try:
        # Check current descriptions
        rows = db.execute(text("SELECT DISTINCT descricao FROM transacoes")).fetchall()
        print("Descrições encontradas:")
        for r in rows:
            print(f"- {r[0]}")
            
        # Try a more flexible update (case insensitive search if possible, or common variations)
        sql = "UPDATE transacoes SET descricao = REPLACE(descricao, 'Pagamento Venerável Mestre', 'Devolução Venerável Mestre') WHERE descricao LIKE '%Pagamento Venerável Mestre%'"
        result = db.execute(text(sql))
        db.commit()
        print(f"\nResultado do UPDATE: {result.rowcount} linhas alteradas.")
        
    except Exception as e:
        print(f"Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    fix_descriptions()
