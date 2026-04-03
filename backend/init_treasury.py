from database import treasury_engine, Base
from models import Caixa, Transacao

def init_treasury():
    print("Initializing Treasury Tables in SQLite...")
    Base.metadata.create_all(bind=treasury_engine)
    print("[OK] Treasury tables created in treasury.db")

if __name__ == "__main__":
    init_treasury()
