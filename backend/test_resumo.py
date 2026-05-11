from sqlalchemy import text
from database import TreasurySessionLocal
from routes.tesouraria import resumo_financeiro
from sqlalchemy.orm import Session

db = TreasurySessionLocal()
try:
    # Test for loja_id = 1
    res = resumo_financeiro(1, db)
    print("Resumo Financeiro (Loja 1):")
    print(res)
except Exception as e:
    import traceback
    print(f"Error: {e}")
    print(traceback.format_exc())
finally:
    db.close()
