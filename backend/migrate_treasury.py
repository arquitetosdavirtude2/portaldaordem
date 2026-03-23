import sqlite3
import os

def migrate():
    db_path = "portal.db"
    if not os.path.exists(db_path):
        print(f"Erro: {db_path} não encontrado.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Criando tabela 'caixas'...")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS caixas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            loja_id INTEGER,
            nome TEXT NOT NULL,
            saldo_atual REAL DEFAULT 0.0,
            FOREIGN KEY (loja_id) REFERENCES lojas(id)
        )
    ''')

    print("Criando tabela 'transacoes'...")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            caixa_id INTEGER,
            pessoa_id INTEGER,
            usuario_id INTEGER,
            tipo TEXT NOT NULL,
            categoria TEXT NOT NULL,
            valor REAL NOT NULL,
            data_vencimento TEXT NOT NULL,
            data_pagamento TEXT,
            descricao TEXT,
            notas TEXT,
            anexo_url TEXT,
            status TEXT DEFAULT 'pendente',
            FOREIGN KEY (caixa_id) REFERENCES caixas(id),
            FOREIGN KEY (pessoa_id) REFERENCES pessoas(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    ''')

    # Seed initial caixas for existing lojas if they don't have any
    cursor.execute("SELECT id FROM lojas")
    lojas = cursor.fetchall()
    
    for (loja_id,) in lojas:
        # Check if boxes exist
        cursor.execute("SELECT COUNT(*) FROM caixas WHERE loja_id = ? AND nome = ?", (loja_id, 'Geral'))
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO caixas (loja_id, nome, saldo_atual) VALUES (?, ?, ?)", (loja_id, 'Geral', 0.0))
        
        cursor.execute("SELECT COUNT(*) FROM caixas WHERE loja_id = ? AND nome = ?", (loja_id, 'Benevolência'))
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO caixas (loja_id, nome, saldo_atual) VALUES (?, ?, ?)", (loja_id, 'Benevolência', 0.0))

    conn.commit()
    conn.close()
    print("Migração da Tesouraria concluída com sucesso!")

if __name__ == "__main__":
    migrate()
