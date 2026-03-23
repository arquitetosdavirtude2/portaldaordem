from database import SessionLocal
from models import Loja, Caixa

def seed_caixas():
    db = SessionLocal()
    try:
        lojas = db.query(Loja).all()
        for loja in lojas:
            # Check if Geral exists
            geral = db.query(Caixa).filter(Caixa.loja_id == loja.id, Caixa.nome == "Geral").first()
            if not geral:
                db.add(Caixa(loja_id=loja.id, nome="Geral", saldo_atual=0.0))
                print(f"Criado caixa Geral para Loja {loja.id}")
            
            # Check if Benevolencia exists
            bene = db.query(Caixa).filter(Caixa.loja_id == loja.id, Caixa.nome == "Benevolência").first()
            if not bene:
                db.add(Caixa(loja_id=loja.id, nome="Benevolência", saldo_atual=0.0))
                print(f"Criado caixa Benevolência para Loja {loja.id}")
        
        db.commit()
        print("Semeio de caixas concluído.")
    except Exception as e:
        print(f"Erro ao semear caixas: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_caixas()
