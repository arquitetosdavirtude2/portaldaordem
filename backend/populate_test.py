from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print("--- UPDATING MICHEL ---")
    try:
        # Set Michel's admission to March 2026 for testing Pendente (Yellow)
        conn.execute(text("UPDATE pessoas SET data_admissao = '2026-03-01' WHERE id = 6"))
        
        # Set Paulo Junior's admission to January 2026 for testing Atrasado (Red)
        conn.execute(text("UPDATE pessoas SET data_admissao = '2026-01-10' WHERE id = 15"))
        
        conn.commit()
        print("Success: Michel and Paulo updated")
    except Exception as e:
        print(f"Error: {e}")
