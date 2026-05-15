from database import engine
from sqlalchemy import text

def create_table_manual():
    queries = [
        """
        CREATE TABLE IF NOT EXISTS conteudos_estudo (
            id INT AUTO_INCREMENT PRIMARY KEY,
            loja_id INT,
            titulo VARCHAR(200) NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            grau INT DEFAULT 1,
            ordem INT DEFAULT 0,
            descricao_jornada TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS materiais_estudo (
            id INT AUTO_INCREMENT PRIMARY KEY,
            conteudo_id INT,
            tipo VARCHAR(50),
            nome_arquivo VARCHAR(200),
            url VARCHAR(500),
            data_upload VARCHAR(30)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS quizzes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            conteudo_id INT,
            pergunta TEXT,
            opcoes_json TEXT,
            resposta_correta TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS progresso_estudo (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pessoa_id INT,
            conteudo_id INT,
            status VARCHAR(50),
            quiz_score FLOAT,
            data_conclusao VARCHAR(30),
            data_agendamento VARCHAR(30)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS entregas_trabalho (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pessoa_id INT,
            conteudo_id INT,
            arquivo_url VARCHAR(500),
            data_entrega VARCHAR(30),
            status VARCHAR(50),
            feedback TEXT
        )
        """
    ]
    
    with engine.connect() as conn:
        for q in queries:
            try:
                conn.execute(text(q))
                conn.commit()
                print(f"Executada query com sucesso")
            except Exception as e:
                print(f"Erro na query: {e}")

if __name__ == "__main__":
    create_table_manual()
