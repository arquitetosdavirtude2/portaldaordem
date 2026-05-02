import sqlite3
import os

# Caminho para o banco de dados da tesouraria
db_path = "backend/tesouraria.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Adiciona a coluna finalidade se não existir
        cursor.execute("ALTER TABLE caixas ADD COLUMN finalidade VARCHAR(50) DEFAULT 'geral'")
        print("Coluna 'finalidade' adicionada com sucesso.")
    except sqlite3.OperationalError:
        print("Coluna 'finalidade' já existe.")
        
    # Atualiza as finalidades baseadas nos nomes atuais (como exemplo/padrão)
    # Recarga Pay -> benevolencia
    # Banco Pan -> mensalidade
    
    cursor.execute("UPDATE caixas SET finalidade = 'benevolencia' WHERE nome LIKE '%Recarga%' OR nome LIKE '%Pay%'")
    cursor.execute("UPDATE caixas SET finalidade = 'mensalidade' WHERE nome LIKE '%Pan%' OR nome LIKE '%Caixa%'")
    
    conn.commit()
    print("Dados de finalidade atualizados.")
    conn.close()
else:
    print(f"Banco de dados não encontrado em {db_path}")
