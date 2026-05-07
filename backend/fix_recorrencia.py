import uuid
from dateutil.relativedelta import relativedelta
from datetime import datetime
from database import SessionLocal
from models import Transacao

db = SessionLocal()

# Procurar todas as transacoes pendentes que tem "MENSAL" na descricao mas estao com recorrencia='nenhuma'
transacoes_mensais = db.query(Transacao).filter(
    Transacao.status == 'pendente',
    Transacao.recorrencia == 'nenhuma',
    Transacao.descricao.like('%MENSAL%')
).all()

count = 0
for t in transacoes_mensais:
    # Marcar como mensal
    t.recorrencia = 'mensal'
    t.grupo_recorrencia = str(uuid.uuid4())
    
    print(f"Atualizando: {t.descricao} (ID: {t.id})")
    
    # Gerar os proximos 11 meses
    if t.data_vencimento:
        data_base = datetime.strptime(str(t.data_vencimento), '%Y-%m-%d')
        for i in range(1, 12):
            nova_data = data_base + relativedelta(months=i)
            
            # Atualizar a descrição com o novo mês de referência (se existir no final)
            # A descrição atual termina com " - Ref: YYYY-MM"
            nova_descricao = t.descricao
            if " - Ref: " in nova_descricao:
                base_desc = nova_descricao.split(" - Ref: ")[0]
                nova_descricao = f"{base_desc} - Ref: {nova_data.strftime('%Y-%m')}"
                
            nova_transacao = Transacao(
                caixa_id=t.caixa_id,
                pessoa_id=t.pessoa_id,
                usuario_id=t.usuario_id,
                tipo=t.tipo,
                categoria=t.categoria,
                valor=t.valor,
                data_vencimento=nova_data.strftime('%Y-%m-%d'),
                descricao=nova_descricao,
                notas=t.notas,
                status="pendente",
                recorrencia="mensal",
                grupo_recorrencia=t.grupo_recorrencia
            )
            db.add(nova_transacao)
        count += 1

db.commit()
db.close()
print(f"\\nPronto! {count} transações mensais foram atualizadas e seus meses futuros foram gerados.")
