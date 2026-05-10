from routes.tesouraria import criar_transacao
from database import get_treasury_db, get_db
import asyncio

async def test_parcelado():
    db_treasury = next(get_treasury_db())
    db_main = next(get_db())
    
    try:
        result = await criar_transacao(
            caixa_id=1,
            pessoa_id=None,
            usuario_id=1,
            tipo="saida",
            categoria="outro_saida",
            valor=100.0,
            data_vencimento="2026-06-30",
            data_pagamento=None,
            mes_referencia="2026-06",
            descricao="Teste Parcelado",
            notas=None,
            status="pendente",
            recorrencia="parcelado",
            total_parcelas=10,
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
    asyncio.run(test_parcelado())
