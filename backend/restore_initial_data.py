from database import SessionLocal
from models import Usuario, Loja, Estado

def restore():
    db = SessionLocal()
    try:
        # 1. Ensure Estado
        sp = db.query(Estado).filter(Estado.sigla == "SP").first()
        if not sp:
            sp = Estado(sigla="SP", nome="São Paulo")
            db.add(sp)
            db.flush()
        
        # 2. Ensure Loja
        loja1 = db.query(Loja).filter(Loja.id == 1).first()
        if not loja1:
            loja1 = Loja(id=1, nome="Arquitetos da Virtude Nº 2", numero="2", estado_id=sp.id)
            db.add(loja1)
            db.flush()
        
        # 3. Restore Users
        users_to_add = [
            {"login": "elias", "nome": "Elias admin", "senha": "elias123", "role": "admin", "loja_id": None},
            {"login": "joao", "nome": "João Estadual", "senha": "joao123", "role": "mestre", "loja_id": None},
            {"login": "elias.mestre", "nome": "Elias Mestre", "senha": "elias123", "role": "loja", "loja_id": 1},
        ]
        
        for u_data in users_to_add:
            u = db.query(Usuario).filter(Usuario.login == u_data["login"]).first()
            if not u:
                u = Usuario(**u_data)
                db.add(u)
                print(f"Restaurado usuário: {u_data['login']}")
            else:
                # Update if exists but wrong loja/role
                u.role = u_data["role"]
                u.loja_id = u_data["loja_id"]
                u.senha = u_data["senha"]
                print(f"Atualizado usuário existente: {u_data['login']}")
        
        db.commit()
    except Exception as e:
        print(f"Erro: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    restore()
