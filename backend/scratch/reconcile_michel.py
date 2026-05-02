import os
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Reconciliação Final e População de Dados (Michel)
# Este script restaura o estado financeiro real baseado no extrato e JSON.

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

def reconcile():
    # 1. Caixas e Saldos Iniciais (Conforme Extrato Pan Out/2025)
    # Nota: O Banco Pan começou Outubro com R$ 4.474,67.
    # Vamos injetar esse saldo inicial como uma entrada de "Saldo Inicial".
    
    caixas_data = [
        {"id": 1, "loja_id": 1, "nome": "BANCO PAN (Geral)", "tipo": "joias_mensalidade", "descricao": "Conta principal no Banco Pan", "saldo_atual": 0},
        {"id": 2, "loja_id": 1, "nome": "SALDO DEVEDOR VM", "tipo": "geral", "descricao": "Conta virtual para controle de débitos do VM", "saldo_atual": 0},
        {"id": 3, "loja_id": 1, "nome": "RECARGA PAY (Benevolência)", "tipo": "benevolencia", "descricao": "Conta para fundos de benevolência", "saldo_atual": 0}
    ]

    with engine.begin() as conn:
        print("Desabilitando restrições de chave estrangeira...")
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        
        print("Limpando tabelas...")
        conn.execute(text("DELETE FROM transacoes"))
        conn.execute(text("DELETE FROM caixas"))
        
        print("Criando Caixas...")
        for c in caixas_data:
            conn.execute(text("""
                INSERT INTO caixas (id, loja_id, nome, tipo, descricao, saldo_atual)
                VALUES (:id, :loja_id, :nome, :tipo, :descricao, :saldo_atual)
            """), c)

        # 2. Saldo Inicial Banco Pan (01/10/2025)
        print("Injetando Saldo Inicial Banco Pan...")
        conn.execute(text("""
            INSERT INTO transacoes (caixa_id, usuario_id, tipo, categoria, valor, data_vencimento, data_pagamento, descricao, status)
            VALUES (1, 1, 'entrada', 'outro_entrada', 4474.67, '2025-10-01', '2025-10-01', 'SALDO INICIAL CONTA BANCO PAN (EXTRATO OUT/25)', 'pago')
        """))

        # 3. Importar JSON e Corrigir Erros de Mapeamento
        print("Importando JSON e corrigindo mapeamentos...")
        try:
            with open('transacoes_michel.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                transacoes = data[2]['data']
                
                for t in transacoes:
                    tid = int(t['id'])
                    
                    # CORREÇÃO: IDs 2 a 20 devem ser no Caixa 1 (Banco Pan), não no Caixa 2.
                    # Eles aparecem no extrato de Outubro.
                    if 2 <= tid <= 20:
                        t['caixa_id'] = 1
                    
                    # CORREÇÃO: ID 246 é SAÍDA.
                    if tid == 246:
                        t['tipo'] = 'saida'
                    
                    # CORREÇÃO: ID 127 é R$ 500.
                    if tid == 127:
                        t['valor'] = 500.00
                    
                    # Mapear outros Benevolência que caíram no Pan se necessário (IDs específicos podem ser adicionados)

                    conn.execute(text("""
                        INSERT INTO transacoes (id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, data_pagamento, descricao, notas, status)
                        VALUES (:id, :caixa_id, :pessoa_id, :usuario_id, :tipo, :categoria, :valor, :data_vencimento, :data_pagamento, :descricao, :notas, :status)
                    """), t)
        except Exception as e:
            print(f"Erro na importação: {e}")

        # 4. Transações Faltantes Reais (Pós-Audit)
        print("Adicionando lançamentos de ajuste pós-audit...")
        extras = [
            {"caixa_id": 1, "tipo": "entrada", "categoria": "mensalidade", "valor": 250.00, "data": "2025-11-07", "desc": "Ajuste: Entrada faltante extrato 07/11"},
            {"caixa_id": 1, "tipo": "entrada", "categoria": "mensalidade", "valor": 250.00, "data": "2025-12-08", "desc": "Ajuste: Entrada faltante extrato 08/12"},
            {"caixa_id": 1, "tipo": "entrada", "categoria": "mensalidade", "valor": 250.00, "data": "2026-03-09", "desc": "Ajuste: Entrada faltante extrato 09/03 (Lote)"},
            {"caixa_id": 1, "tipo": "entrada", "categoria": "mensalidade", "valor": 250.00, "data": "2026-03-09", "desc": "Ajuste: Entrada faltante extrato 09/03 (Lote)"},
            {"caixa_id": 1, "tipo": "entrada", "categoria": "doacao", "valor": 100.00, "data": "2026-03-09", "desc": "Ajuste: Entrada faltante extrato 09/03 (Lote)"},
            {"caixa_id": 1, "tipo": "saida", "categoria": "social", "valor": 350.00, "data": "2026-03-23", "desc": "Ajuste: Saída faltante extrato 23/03"},
            {"caixa_id": 1, "tipo": "saida", "categoria": "social", "valor": 37.27, "data": "2026-04-29", "desc": "Ajuste: Saída faltante extrato 29/04"}
        ]
        for ex in extras:
            conn.execute(text("""
                INSERT INTO transacoes (caixa_id, usuario_id, tipo, categoria, valor, data_vencimento, data_pagamento, descricao, status)
                VALUES (:caixa_id, 1, :tipo, :categoria, :valor, :data, :data, :desc, 'pago')
            """), ex)

        # 5. Forçar Correção de Transparência/Joia (Everson)
        print("Ajustando tipo de ingresso do Ir. Everson...")
        conn.execute(text("UPDATE pessoas SET tipo_ingresso = 'transferencia' WHERE nome LIKE '%Everson%'"))

        print("Recalculando saldos...")
        conn.execute(text("""
            UPDATE caixas c
            SET saldo_atual = (
                SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
                FROM transacoes
                WHERE caixa_id = c.id AND status = 'pago'
            )
        """))
        
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        print("Reconciliação Final Concluída!")

if __name__ == "__main__":
    reconcile()
