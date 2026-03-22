import urllib.request
import json
import urllib.error

data = json.dumps({
    'nome': 'Teste', 
    'telefone': '123', 
    'estado_sigla': 'SP', 
    'status': 'Aprendiz', 
    'cargo': 'Tesoureiro', 
    'loja_id': 1
}).encode('utf-8')

req = urllib.request.Request(
    'http://localhost:8000/api/pessoas/', 
    data=data, 
    headers={'Content-Type': 'application/json'}, 
    method='POST'
)

try:
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
