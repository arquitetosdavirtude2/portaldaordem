-- Criar tabelas
CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senha_master VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS estados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sigla VARCHAR(2) UNIQUE NOT NULL,
    nome VARCHAR(50) NOT NULL,
    senha VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS pessoas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estado_id INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'Profano',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estado_id) REFERENCES estados(id)
);

-- Inserir senha master (TROQUE PARA SUA SENHA!)
INSERT INTO admin (senha_master) VALUES ('master123');

-- Popular todos os estados com senha padrão (você altera depois)
INSERT INTO estados (sigla, nome, senha) VALUES
('AC', 'Acre', 'acre123'),
('AL', 'Alagoas', 'alagoas123'),
('AP', 'Amapá', 'amapa123'),
('AM', 'Amazonas', 'amazonas123'),
('BA', 'Bahia', 'bahia123'),
('CE', 'Ceará', 'ceara123'),
('DF', 'Distrito Federal', 'df123'),
('ES', 'Espírito Santo', 'es123'),
('GO', 'Goiás', 'goias123'),
('MA', 'Maranhão', 'maranhao123'),
('MT', 'Mato Grosso', 'mt123'),
('MS', 'Mato Grosso do Sul', 'ms123'),
('MG', 'Minas Gerais', 'mg123'),
('PA', 'Pará', 'para123'),
('PB', 'Paraíba', 'paraiba123'),
('PR', 'Paraná', 'parana123'),
('PE', 'Pernambuco', 'pe123'),
('PI', 'Piauí', 'piaui123'),
('RJ', 'Rio de Janeiro', 'rj123'),
('RN', 'Rio Grande do Norte', 'rn123'),
('RS', 'Rio Grande do Sul', 'rs123'),
('RO', 'Rondônia', 'rondonia123'),
('RR', 'Roraima', 'roraima123'),
('SC', 'Santa Catarina', 'sc123'),
('SP', 'São Paulo', 'sp123'),
('SE', 'Sergipe', 'sergipe123'),
('TO', 'Tocantins', 'tocantins123');
