from routes.tesouraria import atualizar_transacao, TransacaoUpdate
from database import get_treasury_db
import asyncio

async def test_patch_real():
    db_treasury = next(get_treasury_db())
    
    # Simulate the exact payload from screenshot
    dados = TransacaoUpdate(
        valor=1057.69,
        descricao="Devolução Venerável Mestre - Saldo próprio para construção da Loja - Ref: 2026-06 (Parcela 2/10)",
        mes_referencia="2026-06",
        modo_atualizacao="futuras"
    )
    
    try:
        # We need a real transaction ID that has grupo_recorrencia to test 'futuras'
        # I'll use 291 which was created in my previous test
        result = atualizar_transacao(
            transacao_id=291,
            dados=dados,
            db_treasury=db_treasury
        )
        print(f"Success: {result}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_patch_real())
