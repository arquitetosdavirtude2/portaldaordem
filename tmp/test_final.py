import http.client
import json

def test_final():
    conn = http.client.HTTPConnection("localhost", 8000)
    
    print("--- Testing /api/tesouraria/transacoes/0 ---")
    conn.request("GET", "/api/tesouraria/transacoes/0?mes=4&ano=2026")
    r1 = conn.getresponse()
    print(f"Status: {r1.status}")
    data1 = r1.read().decode()
    print(f"Data: {data1[:500]}")
    
    print("\n--- Testing /api/tesouraria/irmaos/1 ---")
    conn.request("GET", "/api/tesouraria/irmaos/1?mes=4&ano=2026")
    r2 = conn.getresponse()
    print(f"Status: {r2.status}")
    data2 = r2.read().decode()
    print(f"Data: {data2[:500]}")
    
    conn.close()

if __name__ == "__main__":
    test_final()
