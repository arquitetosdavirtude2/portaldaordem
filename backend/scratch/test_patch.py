from routes.tesouraria import atualizar_transacao, TransacaoUpdate
from database import get_treasury_db
import asyncio

async def test_patch():
    db_treasury = next(get_treasury_db())
    
    # Simulate a patch request
    dados = TransacaoUpdate(
        valor=1057.69,
        descricao="Teste Patch",
        mes_referencia="2026-06",
        modo_atualizacao="futuras"
    )
    
    try:
        result = atualizar_transacao(
            transacao_id=290, # Use the one we just created
            dados=dados,
            db_treasury=db_treasury
        )
        print(f"Success: {result}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_patch())
