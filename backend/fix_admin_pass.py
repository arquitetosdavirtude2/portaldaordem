from database import SessionLocal
from models import Admin

def fix_password():
    db = SessionLocal()
    try:
        admin = db.query(Admin).first()
        if admin:
            print(f"Senha atual: {admin.senha_master}")
            admin.senha_master = "admin123"
            db.commit()
            print("Senha atualizada para: admin123")
        else:
            print("Admin não encontrado, criando...")
            admin = Admin(senha_master="admin123")
            db.add(admin)
            db.commit()
            print("Admin criado com senha: admin123")
            
    except Exception as e:
        print(f"Erro: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_password()
