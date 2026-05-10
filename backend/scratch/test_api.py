from fastapi.testclient import TestClient
from main import app
import os
from dotenv import load_dotenv

load_dotenv()

client = TestClient(app)

def test_create():
    payload = {
        "caixa_id": 1,
        "tipo": "saida",
        "categoria": "outro_saida",
        "valor": 1057.69,
        "data_vencimento": "2026-06-30",
        "descricao": "Teste Save",
        "status": "pendente",
        "recorrencia": "nenhuma"
    }
    # Note: the actual endpoint uses Form data
    response = client.post("/api/tesouraria/transacoes/", data=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_create()
