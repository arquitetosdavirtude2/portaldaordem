import requests
import json

def test_api():
    base_url = "http://localhost:8000/api/tesouraria"
    
    print("--- Testing /resumo/1 ---")
    try:
        r = requests.get(f"{base_url}/resumo/1")
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Testing /irmaos/1 ---")
    try:
        r = requests.get(f"{base_url}/irmaos/1?mes=4&ano=2026")
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text[:200]}")
    except Exception as e:
        print(f"Error: {e}")

    print("\n--- Testing /transacoes/0 ---")
    try:
        r = requests.get(f"{base_url}/transacoes/0?mes=4&ano=2026&status=todos")
        print(f"Status: {r.status_code}")
        if r.status_code == 500:
            print("ERROR: 500 Internal Server Error detected!")
        print(f"Body: {r.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api()
