-- Script de migração para criar tabela cargos e normalizar pessoas.cargo

-- 1. Criar tabela cargos
CREATE TABLE IF NOT EXISTS cargos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL UNIQUE,
    isento_contribuicao TINYINT(1) NOT NULL DEFAULT 0
);

-- 2. Inserir todos os cargos maçônicos
INSERT INTO cargos (id, nome, isento_contribuicao) VALUES
(1,  'Venerável Mestre',       1),
(2,  '1º Vigilante',           1),
(3,  '2º Vigilante',           1),
(4,  'Orador',                 0),
(5,  'Secretário',             0),
(6,  'Tesoureiro',             0),
(7,  'Chanceler',              0),
(8,  'Hospitaleiro',           0),
(9,  'Mestre de Cerimônias',   0),
(10, '1º Diácono',             0),
(11, '2º Diácono',             0),
(12, 'Organista',              0),
(13, 'Auxiliar de Secretário', 0),
(14, 'Auxiliar de Tesoureiro', 0),
(15, 'Guarda Interno',         0),
(16, 'Guarda Externo',         0)
ON DUPLICATE KEY UPDATE nome = VALUES(nome), isento_contribuicao = VALUES(isento_contribuicao);

-- 3. Adicionar coluna cargo_id em pessoas (se não existir)
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS cargo_id INT NULL;

-- 4. Migrar dados existentes: texto -> FK
UPDATE pessoas p
JOIN cargos c ON p.cargo = c.nome
SET p.cargo_id = c.id
WHERE p.cargo IS NOT NULL AND p.cargo_id IS NULL;

-- 5. Adicionar FK (ignorar se já existir)
ALTER TABLE pessoas
ADD CONSTRAINT fk_pessoas_cargo
FOREIGN KEY (cargo_id) REFERENCES cargos(id)
ON DELETE SET NULL;

-- 6. Remover coluna antiga
ALTER TABLE pessoas DROP COLUMN cargo;

-- Verificação
SELECT p.nome, c.nome as cargo, c.isento_contribuicao
FROM pessoas p
LEFT JOIN cargos c ON p.cargo_id = c.id;
