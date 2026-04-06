import os
import sqlite3
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import sys

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, engine
import models

# 1. Load env
load_dotenv('backend/.env')

def init_mysql_treasury():
    # 2. Create Tables in MySQL
    print("DEBUG: Initiating MySQL Treasury Tables...")
    Base.metadata.create_all(bind=engine)
    print("DEBUG: MySQL Tables created successfully.")

    # 3. Migrate data from SQLite (Fallback)
    sqlite_path = 'backend/treasury.db'
    if os.path.exists(sqlite_path):
        print(f"DEBUG: Found SQLite source for migration: {sqlite_path}")
        try:
            conn_sq = sqlite3.connect(sqlite_path)
            cursor_sq = conn_sq.cursor()
            
            # Get Caixas
            cursor_sq.execute("SELECT id, loja_id, nome, tipo, saldo_atual FROM caixas")
            caixas = cursor_sq.fetchall()
            
            # Get Transacoes
            cursor_sq.execute("SELECT id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, status, descricao FROM transacoes")
            transacoes = cursor_sq.fetchall()
            
            conn_sq.close()
            
            # Insert into MySQL
            with engine.connect() as conn_my:
                print(f"DEBUG: Migrating {len(caixas)} caixas to MySQL...")
                for c in caixas:
                    # Use INSERT IGNORE or check existence
                    conn_my.execute(text(
                        "INSERT IGNORE INTO caixas (id, loja_id, nome, tipo, saldo_atual) VALUES (:id, :loja_id, :nome, :tipo, :saldo_atual)"
                    ), {"id": c[0], "loja_id": c[1], "nome": c[2], "tipo": c[3], "saldo_atual": c[4]})
                
                print(f"DEBUG: Migrating {len(transacoes)} transacoes to MySQL...")
                for t in transacoes:
                    conn_my.execute(text(
                        "INSERT IGNORE INTO transacoes (id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, status, descricao) "
                        "VALUES (:id, :caixa_id, :pessoa_id, :usuario_id, :tipo, :categoria, :valor, :data_vencimento, :status, :descricao)"
                    ), {
                        "id": t[0], "caixa_id": t[1], "pessoa_id": t[2], "usuario_id": t[3], 
                        "tipo": t[4], "categoria": t[5], "valor": t[6], "data_vencimento": t[7], 
                        "status": t[8], "descricao": t[9]
                    })
                
                conn_my.commit()
                print("--- MIGRATION TO MYSQL COMPLETE ---")
                
                # Cleanup SQLite
                # os.remove(sqlite_path)
                # print(f"DEBUG: Deleted SQLite {sqlite_path}")
                
        except Exception as e:
            print(f"ERROR during migration: {e}")
    else:
        print("DEBUG: No SQLite file found. Database initiated with empty tables (or existing MySQL data).")

if __name__ == "__main__":
    init_mysql_treasury()
