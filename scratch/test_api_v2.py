import requests
import json

def test_api():
    url = "http://localhost:8000/api/pessoas/loja/1"
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Total pessoas: {len(data)}")
            print(json.dumps(data, indent=2))
        else:
            print(f"Erro: {response.text}")
    except Exception as e:
        print(f"Erro ao conectar na API: {e}")

if __name__ == "__main__":
    test_api()
