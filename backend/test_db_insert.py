import traceback
from database import SessionLocal
from models import Pessoa

def test_insert():
    db = SessionLocal()
    try:
        nova_pessoa = Pessoa(
            nome="Teste Erro 500",
            telefone="1199999999",
            status="Aprendiz",
            cargo="Tesoureiro",
            estado_id=25, # SP
            loja_id=1
        )
        db.add(nova_pessoa)
        db.commit()
        print("Success inserting Pessoa!")
    except Exception as e:
        print("Error during insert:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_insert()
