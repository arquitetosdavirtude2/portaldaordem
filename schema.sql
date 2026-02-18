-- Tabela de Estados (com senha de acesso)
CREATE TABLE estados (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(2),        -- Ex: "SP", "MG"
    nome VARCHAR(50),        -- Ex: "São Paulo"
    senha_hash VARCHAR(255)  -- Senha do responsável estadual
);

-- Tabela de Pessoas
CREATE TABLE pessoas (
    id SERIAL PRIMARY KEY,
    estado_id INT REFERENCES estados(id),
    nome VARCHAR(100),
    telefone VARCHAR(20),
    status VARCHAR(30) DEFAULT 'Profano'  -- "Profano" ou "Candidato em Andamento"
);

-- Tabela Admin (só você)
CREATE TABLE admin (
    id SERIAL PRIMARY KEY,
    senha_master_hash VARCHAR(255)
);
