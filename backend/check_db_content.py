from database import SessionLocal
from models import Admin, Usuario, Estado

def check_db():
    db = SessionLocal()
    try:
        print("--- Verificando Admin ---")
        admins = db.query(Admin).all()
        if not admins:
            print("NENHUM ADMIN ENCONTRADO!")
        for a in admins:
            print(f"ID: {a.id}, Senha: {a.senha_master}")
            
        print("\n--- Verificando Usuarios ---")
        users = db.query(Usuario).all()
        for u in users:
             print(f"User: {u.login}, Senha: {u.senha}")
             
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
