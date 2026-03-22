import traceback
from database import SessionLocal
from models import Pessoa

def run():
    db = SessionLocal()
    try:
        nova = Pessoa(nome='Teste', telefone='123', status='Aprendiz', cargo='Tesoureiro', estado_id=25, loja_id=1)
        db.add(nova)
        db.commit()
        print('Success')
    except Exception:
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    run()
