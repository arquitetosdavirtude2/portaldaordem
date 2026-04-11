from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- DATA FIX ---")
    try:
        # 1. Fix Joao's LojaID (assuming Loja 1 based on context)
        conn.execute(text("UPDATE pessoas SET loja_id = 1 WHERE id = 14"))
        
        # 2. Fix Michel's name typo
        conn.execute(text("UPDATE pessoas SET nome = 'Michel Felipe de Carvalho Serra' WHERE id = 6"))
        
        conn.commit()
        print("Success: Joao assigned to Loja 1 and Michel's name corrected.")
    except Exception as e:
        print(f"Error: {e}")
