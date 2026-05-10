from routes.tesouraria import criar_transacao
from database import get_treasury_db, get_db
from sqlalchemy.orm import Session
import asyncio

async def test_direct():
    db_treasury = next(get_treasury_db())
    db_main = next(get_db())
    
    try:
        # Simulate form call
        # async def criar_transacao(caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, 
        # data_vencimento, data_pagamento, mes_referencia, descricao, notas, status, 
        # recorrencia, total_parcelas, comprovante, db_main, db_treasury)
        
        result = await criar_transacao(
            caixa_id=1,
            pessoa_id=None,
            usuario_id=1,
            tipo="saida",
            categoria="outro_saida",
            valor=10.0,
            data_vencimento="2026-06-30",
            data_pagamento=None,
            mes_referencia="2026-06",
            descricao="Teste Direto",
            notas=None,
            status="pendente",
            recorrencia="nenhuma",
            total_parcelas=None,
            comprovante=None,
            db_main=db_main,
            db_treasury=db_treasury
        )
        print(f"Success: {result}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_direct())
