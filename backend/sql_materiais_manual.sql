-- ============================================================
-- SQL MANUAL - Gestao de Materiais - Portal da Ordem
-- Banco: MySQL (producao cPanel)
-- INSTRUCOES: Executar bloco por bloco manualmente.
-- Se uma coluna ja existir, o MySQL retornara "Duplicate column"
-- e voce pode ignorar aquele ALTER especifico.
-- ============================================================


-- ============================================================
-- 1. COLUNAS NECESSARIAS EM materiais_estudo
-- ============================================================

-- 1.1 titulo: titulo legivel do material
ALTER TABLE materiais_estudo ADD COLUMN titulo VARCHAR(200) DEFAULT NULL;

-- 1.2 descricao: descricao curta do material
ALTER TABLE materiais_estudo ADD COLUMN descricao VARCHAR(500) DEFAULT NULL;

-- 1.3 ordem: posicao na sequencia de estudo
ALTER TABLE materiais_estudo ADD COLUMN ordem INT DEFAULT 0;

-- 1.4 duracao_segundos: duracao do video em segundos (opcional)
ALTER TABLE materiais_estudo ADD COLUMN duracao_segundos INT DEFAULT NULL;


-- ============================================================
-- 2. INDICE PARA CONSULTA POR CONTEUDO + TIPO
-- ============================================================

CREATE INDEX idx_materiais_conteudo_tipo ON materiais_estudo (conteudo_id, tipo);


-- ============================================================
-- 3. PREENCHER TITULO DOS MATERIAIS EXISTENTES
-- (Copia nome_arquivo para titulo onde titulo estiver vazio)
-- ============================================================

UPDATE materiais_estudo SET titulo = nome_arquivo WHERE titulo IS NULL;


-- ============================================================
-- FIM
-- ============================================================
