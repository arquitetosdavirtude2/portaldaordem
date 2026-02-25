from dotenv import load_dotenv
load_dotenv()

from database import engine, Base, SessionLocal
from models import Estado, Admin, Usuario, usuario_estados

def inicializar_banco():
    # Cria as tabelas
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if Admin exists
        if not db.query(Admin).first():
            print("Criando Admin...")
            admin = Admin(senha_master="admin123")
            db.add(admin)
        
        # Check if States exist
        if not db.query(Estado).first():
            print("Criando Estados...")
            estados_dados = [
                ('AC', 'Acre'), ('AL', 'Alagoas'), ('AP', 'Amapá'),
                ('AM', 'Amazonas'), ('BA', 'Bahia'), ('CE', 'Ceará'),
                ('DF', 'Distrito Federal'), ('ES', 'Espírito Santo'),
                ('GO', 'Goiás'), ('MA', 'Maranhão'), ('MT', 'Mato Grosso'),
                ('MS', 'Mato Grosso do Sul'), ('MG', 'Minas Gerais'),
                ('PA', 'Pará'), ('PB', 'Paraíba'), ('PR', 'Paraná'),
                ('PE', 'Pernambuco'), ('PI', 'Piauí'), ('RJ', 'Rio de Janeiro'),
                ('RN', 'Rio Grande do Norte'), ('RS', 'Rio Grande do Sul'),
                ('RO', 'Rondônia'), ('RR', 'Roraima'), ('SC', 'Santa Catarina'),
                ('SP', 'São Paulo'), ('SE', 'Sergipe'), ('TO', 'Tocantins')
            ]
            
            for sigla, nome in estados_dados:
                estado = Estado(sigla=sigla, nome=nome)
                db.add(estado)
        
        db.commit()
        print("[OK] Banco inicializado/atualizado com sucesso!")
        
    except Exception as e:
        print(f"[ERRO] Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    inicializar_banco()
