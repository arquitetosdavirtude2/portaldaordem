from database import SessionLocal
from models import Estado
import requests
import sys

def check():
    db = SessionLocal()
    try:
        count = db.query(Estado).count()
        print(f"DB Check: Found {count} states in database.")
        
        if count == 0:
            print("DB is empty! attempting to populate...")
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
                db.add(Estado(sigla=sigla, nome=nome))
            db.commit()
            print("Populated DB with 27 states.")
        
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db.close()

    try:
        print("API Check: requesting http://localhost:8000/api/admin/estados")
        r = requests.get("http://localhost:8000/api/admin/estados", timeout=5)
        print(f"API Status: {r.status_code}")
        print(f"API Content: {r.text[:100]}...")
        if r.status_code == 200:
            data = r.json()
            print(f"API returned {len(data)} items.")
    except Exception as e:
        print(f"API Error: {e}")

if __name__ == "__main__":
    check()
