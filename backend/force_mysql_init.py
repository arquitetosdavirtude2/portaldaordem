import pymysql
import os
from dotenv import load_dotenv

# 1. Load env
load_dotenv('backend/.env')

db_url = os.getenv('DATABASE_URL')
# mysql+pymysql://user:password@host/dbname
user = db_url.split('://')[1].split(':')[0]
password = db_url.split(':')[2].split('@')[0].replace('%40', '@')
host = db_url.split('@')[1].split('/')[0]
db_name = db_url.split('/')[-1].split('?')[0]

def force_init():
    print(f"DEBUG: Connecting to MySQL {host} as {user}...")
    try:
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            database=db_name,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        print("DEBUG: Connection successful.")
        
        with conn.cursor() as cursor:
            # 1. CAIXAS
            print("DEBUG: Creating 'caixas' table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS caixas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    loja_id INT,
                    nome VARCHAR(100),
                    tipo VARCHAR(50) DEFAULT 'geral',
                    descricao VARCHAR(255),
                    saldo_atual FLOAT DEFAULT 0.0,
                    FOREIGN KEY (loja_id) REFERENCES lojas(id)
                ) ENGINE=InnoDB;
            """)
            
            # 2. TRANSACOES
            print("DEBUG: Creating 'transacoes' table...")
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transacoes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    caixa_id INT,
                    pessoa_id INT,
                    usuario_id INT,
                    tipo VARCHAR(20),
                    categoria VARCHAR(50),
                    valor FLOAT,
                    data_vencimento VARCHAR(20),
                    data_pagamento VARCHAR(20),
                    descricao VARCHAR(255),
                    notas TEXT,
                    anexo_url VARCHAR(255),
                    status VARCHAR(20) DEFAULT 'pendente',
                    FOREIGN KEY (caixa_id) REFERENCES caixas(id),
                    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id),
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
                ) ENGINE=InnoDB;
            """)
            
            # 3. Check for Caixa 2
            cursor.execute("SELECT COUNT(*) as count FROM caixas WHERE id = 2")
            if cursor.fetchone()['count'] == 0:
                print("DEBUG: Inserting Caixa 2...")
                cursor.execute(
                    "INSERT INTO caixas (id, loja_id, nome, tipo, saldo_atual) VALUES (2, 1, 'BANCO PAN', 'joias_mensalidade', 750.0)"
                )
            
            conn.commit()
            print("--- MYSQL INITIATION SUCCESSFUL ---")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    force_init()
