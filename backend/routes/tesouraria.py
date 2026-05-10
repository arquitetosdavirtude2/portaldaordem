import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Response
from fastapi.responses import StreamingResponse
import io
import csv
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db, get_treasury_db, TREASURY_DB_URL
from models import Transacao, Pessoa, Caixa, Usuario

from datetime import datetime, date
import calendar
import uuid
import math
import traceback
from sqlalchemy import text

MESES_PT = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
}

UPLOAD_DIR = "static/uploads/comprovantes"
UPLOAD_EXTRATOS_DIR = "static/uploads/extratos"
for d in [UPLOAD_DIR, UPLOAD_EXTRATOS_DIR]:
    if not os.path.exists(d):
        os.makedirs(d, exist_ok=True)

router = APIRouter()


class CaixaCreate(BaseModel):
    loja_id: int
    nome: str
    tipo: str = "geral" 
    finalidade: str = "mensalidade"
    descricao: Optional[str] = None
    saldo_inicial: float = 0.0

class TransacaoResponse(BaseModel):
    id: Optional[int] = None
    caixa_id: Optional[int] = None
    pessoa_id: Optional[int] = None
    usuario_id: Optional[int] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    valor: Optional[float] = 0.0
    data_vencimento: Optional[str] = None
    data_pagamento: Optional[str] = None
    mes_referencia: Optional[str] = None
    descricao: Optional[str] = None
    notas: Optional[str] = None
    anexo_url: Optional[str] = None
    status: Optional[str] = 'pendente'
    recorrencia: Optional[str] = "nenhuma"
    grupo_recorrencia: Optional[str] = None
    parcela_atual: Optional[int] = None
    total_parcelas: Optional[int] = None
    pessoa_nome: Optional[str] = "N/A"
    caixa_nome: Optional[str] = "Geral"
    
    class Config:
        from_attributes = True

class TransacaoUpdate(BaseModel):
    caixa_id: Optional[int] = None
    pessoa_id: Optional[int] = None
    status: Optional[str] = None
    data_pagamento: Optional[str] = None
    notas: Optional[str] = None
    anexo_url: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    data_vencimento: Optional[str] = None
    mes_referencia: Optional[str] = None
    recorrencia: Optional[str] = None
    modo_atualizacao: Optional[str] = "unica"

class IrmaoFlagsUpdate(BaseModel):
    joia_quitada_externa: Optional[bool] = None
    isencao_inicio: Optional[bool] = None

@router.patch("/irmaos/{pessoa_id}/flags")
def atualizar_flags_financeiras(
    pessoa_id: int,
    flags: IrmaoFlagsUpdate,
    db: Session = Depends(get_treasury_db)
):
    from sqlalchemy import text
    try:
        if flags.joia_quitada_externa is not None:
            db.execute(text("UPDATE pessoas SET joia_quitada_externa = :val WHERE id = :pid"), 
                       {"val": 1 if flags.joia_quitada_externa else 0, "pid": pessoa_id})
        
        if flags.isencao_inicio is not None:
            db.execute(text("UPDATE pessoas SET isencao_inicio = :val WHERE id = :pid"), 
                       {"val": 1 if flags.isencao_inicio else 0, "pid": pessoa_id})
        
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class CaixaResponse(BaseModel):
    id: int
    nome: str
    tipo: Optional[str] = "geral"
    finalidade: Optional[str] = "mensalidade"
    saldo_atual: float

    class Config:
        from_attributes = True

class ResumoFinanceiro(BaseModel):
    caixas: List[CaixaResponse] = []
    total_entrada_pendente: float = 0.0
    total_saida_pendente: float = 0.0
    saldo_geral: float = 0.0
    saldo_benevolencia: float = 0.0
    saldo_joias_mensalidade: float = 0.0

@router.get("/caixas", response_model=List[CaixaResponse])
def listar_caixas(loja_id: int, db_treasury: Session = Depends(get_treasury_db)):
    return db_treasury.query(Caixa).filter(Caixa.loja_id == loja_id).all()

@router.post("/caixas", response_model=CaixaResponse)
def criar_caixa(dados: CaixaCreate, db_treasury: Session = Depends(get_treasury_db)):
    novo_caixa = Caixa(
        loja_id=dados.loja_id,
        nome=dados.nome,
        tipo=dados.tipo,
        finalidade=dados.finalidade,
        descricao=dados.descricao,
        saldo_atual=dados.saldo_inicial
    )
    db_treasury.add(novo_caixa)
    db_treasury.commit()
    db_treasury.refresh(novo_caixa)
    return novo_caixa

class ExtratoMensalResponse(BaseModel):
    id: int
    loja_id: int
    caixa_id: int
    ano: int
    mes: int
    arquivo_url: str
    nome_arquivo: str
    criado_em: str

    class Config:
        from_attributes = True

@router.post("/transacoes/", response_model=TransacaoResponse)
async def criar_transacao(
    caixa_id: int = Form(...),
    pessoa_id: Optional[int] = Form(None),
    usuario_id: Optional[int] = Form(None),
    tipo: str = Form(...),
    categoria: str = Form(...),
    valor: float = Form(...),
    data_vencimento: str = Form(...),
    data_pagamento: Optional[str] = Form(None),
    mes_referencia: Optional[str] = Form(None),
    descricao: str = Form(...),
    notas: Optional[str] = Form(None),
    status: Optional[str] = Form("pendente"),
    recorrencia: Optional[str] = Form("nenhuma"),
    total_parcelas: Optional[int] = Form(None),
    comprovante: Optional[UploadFile] = File(None),
    db_main: Session = Depends(get_db),
    db_treasury: Session = Depends(get_treasury_db)
):
    try:
        from models import Usuario

        caixa = db_treasury.query(Caixa).filter(Caixa.id == caixa_id).first()
        if not caixa:
            raise HTTPException(status_code=404, detail="Caixa não encontrado")

        # Proteção para pessoa_id negativo (VMs virtuais)
        pid_final = pessoa_id
        if pid_final and pid_final < 0:
            pid_final = None
        
        uid_final = usuario_id
        if uid_final:
            exists = db_treasury.execute(text("SELECT id FROM usuarios WHERE id = :uid"), {"uid": uid_final}).fetchone()
            if not exists:
                uid_final = None
        if not uid_final:
            first_user = db_treasury.execute(text("SELECT id FROM usuarios LIMIT 1")).fetchone()
            uid_final = first_user[0] if first_user else 1
        
        anexo_url = None
        if comprovante:
            ext = os.path.splitext(comprovante.filename)[1]
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"recibo_{timestamp}{ext}"
            filepath = os.path.join(UPLOAD_DIR, filename)
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(comprovante.file, buffer)
            anexo_url = f"/api/static/uploads/comprovantes/{filename}"

        grupo_uuid = str(uuid.uuid4()) if recorrencia in ['mensal', 'anual', 'parcelado'] else None
        
        transacoes_criadas = []
        
        if recorrencia == 'parcelado' and total_parcelas and total_parcelas > 1:
            valor_parcela = math.floor((valor / total_parcelas) * 100) / 100
            resto = round(valor - (valor_parcela * total_parcelas), 2)
            
            try:
                base_date = datetime.strptime(data_vencimento, "%Y-%m-%d")
            except:
                base_date = datetime.now()

            for i in range(1, total_parcelas + 1):
                valor_atual = valor_parcela
                if i == total_parcelas:
                    valor_atual = round(valor_parcela + resto, 2)
                    
                mes = base_date.month + (i - 1)
                ano = base_date.year + (mes - 1) // 12
                mes = (mes - 1) % 12 + 1
                # Adjust day to avoid out of range
                try:
                    data_venc_atual = base_date.replace(year=ano, month=mes).strftime("%Y-%m-%d")
                except ValueError:
                    import calendar
                    _, last_day = calendar.monthrange(ano, mes)
                    data_venc_atual = base_date.replace(year=ano, month=mes, day=min(base_date.day, last_day)).strftime("%Y-%m-%d")
                
                # Adjust reference month if present
                desc_atual = descricao
                if " - Ref: " in desc_atual:
                    base_desc = desc_atual.split(" - Ref: ")[0]
                    desc_atual = f"{base_desc} - Ref: {ano}-{mes:02d}"
                elif " - REF: " in desc_atual:
                    base_desc = desc_atual.split(" - REF: ")[0]
                    desc_atual = f"{base_desc} - REF: {ano}-{mes:02d}"

                desc_atual = f"{desc_atual} (Parcela {i}/{total_parcelas})"
                
                nova_transacao = Transacao(
                    caixa_id=caixa_id,
                    pessoa_id=pid_final,
                    usuario_id=uid_final,
                    tipo=tipo,
                    categoria=categoria,
                    valor=valor_atual,
                    data_vencimento=data_venc_atual,
                    data_pagamento=data_pagamento if i == 1 else None,
                    descricao=desc_atual,
                    notas=notas,
                    anexo_url=anexo_url if i == 1 else None,
                    status=status if i == 1 else "pendente",
                    recorrencia=recorrencia,
                    grupo_recorrencia=grupo_uuid,
                    parcela_atual=i,
                    total_parcelas=total_parcelas,
                    mes_referencia=f"{ano}-{mes:02d}"
                )
                transacoes_criadas.append(nova_transacao)
                db_treasury.add(nova_transacao)

        elif recorrencia in ['mensal', 'anual']:
            repeticoes = 12 if recorrencia == 'mensal' else 5 # 12 meses ou 5 anos
            
            try:
                base_date = datetime.strptime(data_vencimento, "%Y-%m-%d")
            except:
                base_date = datetime.now()

            for i in range(1, repeticoes + 1):
                if recorrencia == 'mensal':
                    mes = base_date.month + (i - 1)
                    ano = base_date.year + (mes - 1) // 12
                    mes = (mes - 1) % 12 + 1
                else:
                    mes = base_date.month
                    ano = base_date.year + (i - 1)

                try:
                    data_venc_atual = base_date.replace(year=ano, month=mes).strftime("%Y-%m-%d")
                except ValueError:
                    import calendar
                    _, last_day = calendar.monthrange(ano, mes)
                    data_venc_atual = base_date.replace(year=ano, month=mes, day=min(base_date.day, last_day)).strftime("%Y-%m-%d")
                
                desc_atual = descricao
                if " - Ref: " in desc_atual:
                    base_desc = desc_atual.split(" - Ref: ")[0]
                    desc_atual = f"{base_desc} - Ref: {ano}-{mes:02d}"
                elif " - REF: " in desc_atual:
                    base_desc = desc_atual.split(" - REF: ")[0]
                    desc_atual = f"{base_desc} - REF: {ano}-{mes:02d}"

                nova_transacao = Transacao(
                    caixa_id=caixa_id,
                    pessoa_id=pid_final,
                    usuario_id=uid_final,
                    tipo=tipo,
                    categoria=categoria,
                    valor=valor,
                    data_vencimento=data_venc_atual,
                    data_pagamento=data_pagamento if i == 1 else None,
                    descricao=desc_atual,
                    notas=notas,
                    anexo_url=anexo_url if i == 1 else None,
                    status=status if i == 1 else "pendente",
                    recorrencia=recorrencia,
                    grupo_recorrencia=grupo_uuid,
                    parcela_atual=i,
                    total_parcelas=repeticoes,
                    mes_referencia=f"{ano}-{mes:02d}"
                )
                transacoes_criadas.append(nova_transacao)
                db_treasury.add(nova_transacao)
                
        else:
            nova_transacao = Transacao(
                caixa_id=caixa_id,
                pessoa_id=pid_final,
                usuario_id=uid_final,
                tipo=tipo,
                categoria=categoria,
                valor=valor,
                data_vencimento=data_vencimento,
                data_pagamento=data_pagamento,
                descricao=descricao,
                notas=notas,
                anexo_url=anexo_url,
                status=status,
                recorrencia="nenhuma",
                mes_referencia=mes_referencia
            )
            transacoes_criadas.append(nova_transacao)
            db_treasury.add(nova_transacao)

        db_treasury.commit()
        
        # Refresh a primeira transacao para retornar
        primeira_transacao = transacoes_criadas[0]
        db_treasury.refresh(primeira_transacao)
        
        if primeira_transacao.status == "pago":
            if primeira_transacao.tipo == "entrada":
                caixa.saldo_atual += primeira_transacao.valor
            else:
                caixa.saldo_atual -= primeira_transacao.valor
            db_treasury.commit()

        p_nome = None
        if primeira_transacao.pessoa_id:
            p = db_main.query(Pessoa).filter(Pessoa.id == primeira_transacao.pessoa_id).first()
            p_nome = p.nome if p else None

        return TransacaoResponse(
            id=primeira_transacao.id,
            caixa_id=primeira_transacao.caixa_id,
            pessoa_id=primeira_transacao.pessoa_id,
            pessoa_nome=p_nome,
            tipo=primeira_transacao.tipo,
            categoria=primeira_transacao.categoria,
            valor=primeira_transacao.valor,
            data_vencimento=primeira_transacao.data_vencimento,
            data_pagamento=primeira_transacao.data_pagamento,
            descricao=primeira_transacao.descricao,
            notas=primeira_transacao.notas,
            anexo_url=primeira_transacao.anexo_url,
            status=primeira_transacao.status,
            recorrencia=primeira_transacao.recorrencia,
            grupo_recorrencia=primeira_transacao.grupo_recorrencia,
            parcela_atual=primeira_transacao.parcela_atual,
            total_parcelas=primeira_transacao.total_parcelas,
            mes_referencia=primeira_transacao.mes_referencia
        )
    except Exception as e:
        db_treasury.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@router.patch("/transacoes/{transacao_id}", response_model=TransacaoResponse)
def atualizar_transacao(transacao_id: int, dados: TransacaoUpdate, db_treasury: Session = Depends(get_treasury_db)):
    transacao = db_treasury.query(Transacao).filter(Transacao.id == transacao_id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    try:
        if hasattr(dados, "model_dump"):
            update_data = dados.model_dump(exclude_unset=True)
        else:
            update_data = dados.dict(exclude_unset=True)

        # Proteção para pessoa_id negativo
        if 'pessoa_id' in update_data and update_data['pessoa_id'] and update_data['pessoa_id'] < 0:
            update_data['pessoa_id'] = None

        modo_atualizacao = update_data.pop("modo_atualizacao", "unica")

        # Formata datas
        if "data_vencimento" in update_data and update_data["data_vencimento"]:
            dv = update_data["data_vencimento"]
            if "/" in dv: dv = "-".join(dv.split("/")[::-1])
            update_data["data_vencimento"] = dv
            
        if "data_pagamento" in update_data and update_data["data_pagamento"]:
            dp = update_data["data_pagamento"]
            if "/" in dp: dp = "-".join(dp.split("/")[::-1])
            update_data["data_pagamento"] = dp
            
        if "pessoa_id" in update_data:
            if update_data["pessoa_id"] == 0 or (update_data["pessoa_id"] and int(update_data["pessoa_id"]) < 0):
                update_data["pessoa_id"] = None
            else:
                update_data["pessoa_id"] = int(update_data["pessoa_id"])

        # Helper para saldo
        def update_balance(box_id, amount, is_add):
            if box_id:
                sign = "+" if is_add else "-"
                db_treasury.execute(text(f"UPDATE caixas SET saldo_atual = saldo_atual {sign} :amt WHERE id = :bid"), {"amt": amount, "bid": box_id})

        # Processar as transações a serem atualizadas
        transacoes_alvo = [transacao]
        
        if modo_atualizacao in ['futuras', 'todas'] and transacao.grupo_recorrencia:
            if modo_atualizacao == 'futuras':
                transacoes_alvo = db_treasury.query(Transacao).filter(
                    Transacao.grupo_recorrencia == transacao.grupo_recorrencia,
                    Transacao.data_vencimento >= transacao.data_vencimento
                ).all()
            else: # todas
                transacoes_alvo = db_treasury.query(Transacao).filter(
                    Transacao.grupo_recorrencia == transacao.grupo_recorrencia
                ).all()

        for t in transacoes_alvo:
            c_id = t.caixa_id
            c_valor = t.valor
            c_tipo = t.tipo
            c_status = t.status

            # O status só muda para a transação principal (transacao_id)
            # Valor e Tipo podem mudar para o lote todo
            new_status = update_data.get("status") if (t.id == transacao_id and update_data.get("status") is not None) else c_status
            new_valor = update_data.get("valor") if update_data.get("valor") is not None else c_valor
            new_tipo = update_data.get("tipo") if update_data.get("tipo") is not None else c_tipo

            # Atualizar Saldo Bancário apenas se status/valor mudou
            if new_status == "pago" and c_status != "pago":
                update_balance(c_id, new_valor or 0, new_tipo == "entrada")
            elif c_status == "pago":
                # Reverse old
                update_balance(c_id, c_valor or 0, c_tipo != "entrada")
                # Apply new only if it is still pago
                if new_status == "pago":
                    update_balance(c_id, new_valor or 0, new_tipo == "entrada")

            # Atualizar os campos no banco
            for k, v in update_data.items():
                if k == 'status' and t.id != transacao_id:
                    continue # Não atualiza o status em lote (pode estar pago ou pendente independente)
                if (k == 'data_pagamento' and t.id != transacao_id):
                    continue # Não atualiza data pagamento em lote
                
                if (k == 'mes_referencia' and t.id != transacao_id):
                    continue # Não atualiza mês de referência em lote (cada um tem o seu)

                if k == 'data_vencimento' and t.id != transacao_id:
                    # Para outras do grupo, mudar apenas o dia
                    if v and t.data_vencimento:
                        try:
                            v_str = str(v)
                            new_day = v_str.split('-')[2] if '-' in v_str and len(v_str.split('-')) >= 3 else "01"
                            old_ym = t.data_vencimento[:8] # YYYY-MM-
                            
                            # Handle month ends (e.g. 31st on Feb)
                            try:
                                datetime.strptime(f"{old_ym}{new_day}", "%Y-%m-%d")
                                setattr(t, k, f"{old_ym}{new_day}")
                            except ValueError:
                                import calendar
                                y, m = map(int, old_ym.split('-')[:2])
                                _, last_day = calendar.monthrange(y, m)
                                safe_day = min(int(new_day), last_day)
                                setattr(t, k, f"{old_ym}{safe_day:02d}")
                        except Exception:
                            pass
                    continue

                # Se for a mesma transação (ou campos genericos do lote como pessoa_id, categoria, etc)
                if hasattr(t, k):
                    # Se for a descrição e for edição em lote, recalcular a REF: se existir
                    if k == 'descricao' and t.id != transacao_id and v:
                        v_str = str(v)
                        sep = None
                        if ' - Ref: ' in v_str: sep = ' - Ref: '
                        elif ' - REF: ' in v_str: sep = ' - REF: '
                        
                        if sep:
                            try:
                                base_desc = v_str.split(sep)[0]
                                # Usa o mês de referência da transação ALVO (t) se existir, senão usa data_vencimento
                                nova_ref = t.mes_referencia if t.mes_referencia else (t.data_vencimento[:7] if t.data_vencimento else "")
                                
                                # Mantém o sufixo de parcela se existir
                                suffix = ""
                                if t.parcela_atual and t.total_parcelas:
                                    suffix = f" (Parcela {t.parcela_atual}/{t.total_parcelas})"
                                
                                v_recalculado = f"{base_desc}{sep}{nova_ref}{suffix}"
                                setattr(t, k, v_recalculado)
                            except:
                                setattr(t, k, v)
                        else:
                            setattr(t, k, v)
                    else:
                        setattr(t, k, v)

        db_treasury.commit()
        db_treasury.refresh(transacao)

        return TransacaoResponse(
            id=transacao.id,
            caixa_id=transacao.caixa_id,
            pessoa_id=transacao.pessoa_id,
            tipo=transacao.tipo,
            categoria=transacao.categoria,
            valor=transacao.valor,
            data_vencimento=transacao.data_vencimento,
            data_pagamento=transacao.data_pagamento,
            mes_referencia=transacao.mes_referencia,
            descricao=transacao.descricao or "",
            notas=transacao.notas,
            anexo_url=transacao.anexo_url,
            status=transacao.status,
            recorrencia=transacao.recorrencia,
            grupo_recorrencia=transacao.grupo_recorrencia,
            parcela_atual=transacao.parcela_atual,
            total_parcelas=transacao.total_parcelas
        )

    except HTTPException:
        db_treasury.rollback()
        raise
    except Exception as e:
        db_treasury.rollback()
        print(f"ERRO CRITICO (BATCH SQL): {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Erro banco de dados: {str(e)}")

@router.get("/transacao/{transacao_id}", response_model=TransacaoResponse)
def obter_detalhes_transacao(transacao_id: int, db_treasury: Session = Depends(get_treasury_db)):
    from sqlalchemy import text
    try:
        sql = """
            SELECT t.id, t.caixa_id, t.pessoa_id, t.usuario_id, t.tipo, t.categoria, t.valor, 
                   t.data_vencimento, t.data_pagamento, t.descricao, t.status, t.anexo_url
            FROM transacoes t
            WHERE t.id = :id
        """
        row = db_treasury.execute(text(sql), {"id": transacao_id}).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        
        return TransacaoResponse(
            id=row[0],
            caixa_id=row[1],
            pessoa_id=row[2],
            usuario_id=row[3],
            tipo=row[4],
            categoria=row[5],
            valor=row[6],
            data_vencimento=row[7],
            data_pagamento=row[8],
            descricao=row[9],
            status=row[10],
            anexo_url=row[11]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/transacoes/{transacao_id}")
def excluir_transacao(transacao_id: int, excluir_grupo: bool = False, db_treasury: Session = Depends(get_treasury_db)):
    transacao = db_treasury.query(Transacao).filter(Transacao.id == transacao_id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    if excluir_grupo and transacao.grupo_recorrencia:
        db_treasury.query(Transacao).filter(
            Transacao.grupo_recorrencia == transacao.grupo_recorrencia,
            Transacao.status == 'pendente'
        ).delete()
        db_treasury.commit()
        return {"status": "success", "message": "Todas as parcelas futuras foram excluídas"}

    # Reverse balance if paid and move back to pending (estorno)
    if transacao.status == "pago":
        caixa = transacao.caixa
        if transacao.tipo == "entrada":
            caixa.saldo_atual -= transacao.valor
        else:
            caixa.saldo_atual += transacao.valor
            
        transacao.status = "pendente"
        transacao.data_pagamento = None
        db_treasury.commit()
        
        msg = "Transação estornada para Contas a Receber" if transacao.tipo == "entrada" else "Transação estornada para Contas a Pagar"
        return {"status": "success", "message": msg}
            
    db_treasury.delete(transacao)
    db_treasury.commit()
    return {"status": "success", "message": "Transação excluída"}

@router.get("/transacoes/{caixa_id}")
def listar_transacoes(
    caixa_id: int, 
    loja_id: int,
    mes: Optional[int] = None, 
    ano: Optional[int] = None, 
    status: Optional[str] = None,
    busca: Optional[str] = None,
    db_treasury: Session = Depends(get_treasury_db)
):
    try:
        from sqlalchemy import text
        
        # Base query with LEFT JOIN to avoid missing data if caixa_id is null
        # We also need to be careful with loja_id filtering if caixa is missing
        query = """
            SELECT t.id, t.caixa_id, t.pessoa_id, t.usuario_id, t.tipo, t.categoria, t.valor, 
                   t.data_vencimento, t.data_pagamento, t.descricao, t.status, t.anexo_url,
                   c.loja_id, p.nome,
                   t.recorrencia, t.grupo_recorrencia, t.parcela_atual, t.total_parcelas
            FROM transacoes t
            LEFT JOIN caixas c ON t.caixa_id = c.id
            LEFT JOIN pessoas p ON t.pessoa_id = p.id
            WHERE (c.loja_id = :loja_id OR t.caixa_id IS NULL)
        """
        params = {"loja_id": loja_id}

        if caixa_id > 0:
            query += " AND t.caixa_id = :caixa_id"
            params["caixa_id"] = caixa_id
        
        if status and status != 'todos':
            query += " AND t.status = :status"
            params["status"] = status
            
        if mes and ano:
            if status == 'pendente':
                import calendar
                from datetime import date
                _, last_day = calendar.monthrange(ano, mes)
                data_limite = date(ano, mes, last_day).strftime("%Y-%m-%d")
                query += " AND t.data_vencimento <= :data_limite"
                params["data_limite"] = data_limite
            else:
                query += """ AND (
                    CASE 
                        WHEN t.status = 'pago' AND (t.data_pagamento IS NOT NULL AND t.data_pagamento != '') 
                        THEN t.data_pagamento 
                        ELSE t.data_vencimento 
                    END
                ) LIKE :ano_mes """
                params["ano_mes"] = f"{ano}-{mes:02d}%"
        elif mes:
            query += " AND t.data_vencimento LIKE :mes_match"
            params["mes_match"] = f"%-{mes:02d}-%"
        elif ano:
            query += " AND t.data_vencimento LIKE :ano_match"
            params["ano_match"] = f"{ano}-%"

        if busca:
            query += " AND (t.descricao LIKE :busca OR t.categoria LIKE :busca)"
            params["busca"] = f"%{busca}%"

        query += " ORDER BY t.data_vencimento DESC"
        
        rows = db_treasury.execute(text(query), params).fetchall()
        
        res = []
        for r in rows:
            res.append(TransacaoResponse(
                id=r[0],
                caixa_id=r[1],
                pessoa_id=r[2],
                usuario_id=r[3],
                tipo=r[4],
                categoria=r[5],
                valor=r[6],
                data_vencimento=r[7],
                data_pagamento=r[8],
                descricao=r[9],
                status=r[10],
                anexo_url=r[11],
                pessoa_nome=r[13] if r[13] else "N/A",
                recorrencia=r[14] if r[14] else "nenhuma",
                grupo_recorrencia=r[15] if len(r) > 15 else None,
                parcela_atual=r[16] if len(r) > 16 else None,
                total_parcelas=r[17] if len(r) > 17 else None
            ))
        return res

    except Exception as e:
        print(f"ERRO AO LISTAR TRANSACOES (SQL): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── ENDPOINTS DE EXTRATOS MENSAIS ──────────────────────────────────────────

@router.post("/extratos")
async def subir_extrato(
    loja_id: int = Form(...),
    caixa_id: int = Form(...),
    ano: int = Form(...),
    mes: int = Form(...),
    arquivo: UploadFile = File(...),
    db_treasury: Session = Depends(get_treasury_db)
):
    from models import ExtratoMensal
    from datetime import datetime
    
    # Salvar arquivo
    ext = os.path.splitext(arquivo.filename)[1]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"extrato_{caixa_id}_{ano}_{mes}_{timestamp}{ext}"
    filepath = os.path.join(UPLOAD_EXTRATOS_DIR, filename)
    
    # Garantir que a pasta existe
    os.makedirs(UPLOAD_EXTRATOS_DIR, exist_ok=True)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(arquivo.file, buffer)
    
    novo_extrato = ExtratoMensal(
        loja_id=loja_id,
        caixa_id=caixa_id,
        ano=ano,
        mes=mes,
        arquivo_url=f"/api/static/uploads/extratos/{filename}",
        nome_arquivo=arquivo.filename,
        criado_em=datetime.now().isoformat()
    )
    
    db_treasury.add(novo_extrato)
    db_treasury.commit()
    db_treasury.refresh(novo_extrato)
    return novo_extrato

@router.get("/extratos/{caixa_id}/{ano}/{mes}", response_model=List[ExtratoMensalResponse])
def listar_extratos(
    caixa_id: int, 
    ano: int, 
    mes: int, 
    db_treasury: Session = Depends(get_treasury_db)
):
    from models import ExtratoMensal
    extratos = db_treasury.query(ExtratoMensal).filter(
        ExtratoMensal.caixa_id == caixa_id,
        ExtratoMensal.ano == ano,
        ExtratoMensal.mes == mes
    ).all()
    return extratos

@router.delete("/extratos/{extrato_id}")
def excluir_extrato(extrato_id: int, db_treasury: Session = Depends(get_treasury_db)):
    from models import ExtratoMensal
    extrato = db_treasury.query(ExtratoMensal).filter(ExtratoMensal.id == extrato_id).first()
    if not extrato:
        raise HTTPException(status_code=404, detail="Extrato não encontrado")
    
    # Tentar remover arquivo físico
    try:
        path = extrato.arquivo_url.lstrip("/")
        if os.path.exists(path):
            os.remove(path)
    except:
        pass
        
    db_treasury.delete(extrato)
    db_treasury.commit()
    return {"message": "Extrato removido com sucesso"}

@router.get("/resumo/{loja_id}")
def resumo_financeiro(loja_id: int, db_treasury: Session = Depends(get_treasury_db)):
    """Resumo financeiro dinâmico via MySQL."""
    try:
        from sqlalchemy import text
        db_treasury.expire_all()
        
        # 1. Buscar Caixas (Contas) da Loja com SALDO CALCULADO EM TEMPO REAL
        # Não confiamos mais no campo 'saldo_atual' da tabela caixas.
        query_caixas = text("""
            SELECT c.id, c.nome, c.finalidade,
                (SELECT COALESCE(SUM(CASE WHEN t.tipo='entrada' THEN t.valor ELSE -t.valor END), 0)
                 FROM transacoes t 
                 WHERE t.caixa_id = c.id AND t.status = 'pago') as saldo_real
            FROM caixas c 
            WHERE c.loja_id = :lid
        """)
        caixas_rows = db_treasury.execute(query_caixas, {"lid": loja_id}).fetchall()
        
        caixas = []
        saldo_geral = 0.0
        saldo_ben = 0.0
        saldo_jm = 0.0
        
        for r in caixas_rows:
            # c.id, c.nome, c.finalidade, saldo_real
            c_id = r[0]
            c_nome = r[1]
            c_fin = r[2] or 'mensalidade'
            c_saldo = float(r[3] or 0.0)

            caixas.append({
                "id": c_id,
                "nome": c_nome,
                "finalidade": c_fin,
                "saldo_atual": c_saldo
            })
            
            saldo_geral += c_saldo
            if c_fin == 'benevolencia':
                saldo_ben += c_saldo
            elif c_fin == 'mensalidade':
                saldo_jm += c_saldo
        
        # 2. Calcular Pendências (Apenas da Loja atual)
        query_pend = text("""
            SELECT t.tipo, SUM(t.valor) as total 
            FROM transacoes t
            JOIN caixas c ON t.caixa_id = c.id
            WHERE t.status = 'pendente' 
              AND c.loja_id = :lid
            GROUP BY t.tipo
        """)
        pend_rows = db_treasury.execute(query_pend, {"lid": loja_id}).fetchall()
        
        ent_pend = 0.0
        sai_pend = 0.0
        for p in pend_rows:
            if p[0] == 'entrada':
                ent_pend = float(p[1] or 0.0)
            elif p[0] == 'saida':
                sai_pend = float(p[1] or 0.0)
        
        return {
            "caixas": caixas,
            "total_entrada_pendente": ent_pend,
            "total_saida_pendente": sai_pend,
            "saldo_geral": saldo_geral,
            "saldo_benevolencia": saldo_ben,
            "saldo_joias_mensalidade": saldo_jm
        }
    except Exception as e:
        print(f"ERRO CRÍTICO NO RESUMO: {e}")
        import traceback
        print(traceback.format_exc())
        import traceback
        return {
            "caixas": [],
            "total_entrada_pendente": 0.0,
            "total_saida_pendente": 0.0,
            "saldo_geral": 0.0,
            "saldo_benevolencia": 0.0,
            "saldo_joias_mensalidade": 0.0,
            "error": str(e),
            "traceback": traceback.format_exc()
        }

def _get_per_capita_stats(loja_id: int, mes_ref: str, db):
    from sqlalchemy import text
    from datetime import datetime
    
    # Parse do mês de referência
    try:
        ref_date = datetime.strptime(mes_ref, "%Y-%m")
        ref_ano = ref_date.year
        ref_mes = ref_date.month
    except:
        return {"contagem": 0, "valor_unitario": 50.0, "total": 0.0}
    
    # Query para pegar pessoas (não VM e não candidatos)
    query = text("""
        SELECT data_admissao, data_iniciacao, data_adormecimento, ativo
        FROM pessoas
        WHERE loja_id = :lid
          AND (cargo_id != 1 OR cargo_id IS NULL)
          AND (COALESCE(tipo_pessoa, 'obreiro') != 'candidato')
    """)
    rows = db.execute(query, {"lid": loja_id}).fetchall()
    
    contagem = 0
    for r in rows:
        data_adm_str = r[0] or r[1] # data_admissao ou data_iniciacao
        data_ador_str = r[2]
        is_ativo = r[3] == 1
        
        # Se está adormecido, verificar se foi NESTE mês
        if not is_ativo or (data_ador_str and data_ador_str.strip()):
            if data_ador_str:
                try:
                    dt_ador = datetime.strptime(data_ador_str, "%Y-%m-%d").date()
                    # Se adormeceu no mês de referência (ou depois), ainda conta para este mês
                    if dt_ador.year > ref_ano or (dt_ador.year == ref_ano and dt_ador.month >= ref_mes):
                        pass # Continua para checar data de admissão
                    else:
                        continue # Adormeceu em meses passados, não conta
                except:
                    continue # Data inválida e inativo, melhor não contar
            else:
                continue # Inativo sem data, não conta

        if not data_adm_str:
            contagem += 1
            continue
            
        try:
            dt_adm = datetime.strptime(data_adm_str, "%Y-%m-%d").date()
            
            # Regra: Se iniciou no mês de referência após o dia 15, não conta
            if dt_adm.year == ref_ano and dt_adm.month == ref_mes:
                if dt_adm.day <= 15:
                    contagem += 1
            # Se iniciou antes do mês de referência, conta
            elif dt_adm.year < ref_ano or (dt_adm.year == ref_ano and dt_adm.month < ref_mes):
                contagem += 1
        except:
            contagem += 1
            
    return {"contagem": contagem, "valor_unitario": 50.0, "total": contagem * 50.0}

@router.get("/contagem-per-capita/{loja_id}")
def obter_contagem_per_capita(
    loja_id: int, 
    mes_ref: str, # Formato YYYY-MM
    db_treasury: Session = Depends(get_treasury_db)
):
    """Calcula quantos obreiros ativos devem pagar Per Capita no mês de referência."""
    return _get_per_capita_stats(loja_id, mes_ref, db_treasury)

def sync_per_capitas_pendentes(loja_id: int, db):
    """Varre todas as transações de per_capita pendentes da loja e atualiza valores baseado no quadro atual."""
    from models import Transacao, Caixa
    from datetime import datetime
    
    # Pegar todos os caixas da loja
    caixas_ids = [c.id for c in db.query(Caixa).filter(Caixa.loja_id == loja_id).all()]
    if not caixas_ids:
        return
        
    # Buscar transações de per_capita pendentes nestes caixas
    transacoes = db.query(Transacao).filter(
        Transacao.caixa_id.in_(caixas_ids),
        Transacao.categoria == 'per_capita',
        Transacao.status == 'pendente'
    ).all()
    
    for t in transacoes:
        # Extrair mês de referência da data de vencimento (ou descrição se necessário)
        # Vamos usar a data de vencimento como guia
        if not t.data_vencimento:
            continue
            
        mes_ref = t.data_vencimento[:7] # YYYY-MM
        stats = _get_per_capita_stats(loja_id, mes_ref, db)
        
        t.valor = stats['total']
        # Preservar o prefixo da descrição se existir (ex: "Per Capita - Ref: 2024-05")
        base_desc = t.descricao.split(" - ")[0] if " - " in t.descricao else "Per Capita"
        t.descricao = f"{base_desc} - {stats['contagem']} Obreiros"
        
    db.commit()

class IrmaoFinanceiro(BaseModel):
    id: int
    nome: str
    joia_paga: float
    joia_pendente: float
    mensalidade_paga: float
    mensalidade_pendente: float
    saude_financeira: str

@router.get("/irmaos/{loja_id}")
def listar_financeiro_irmaos(
    loja_id: int, 
    mes: Optional[int] = None, 
    ano: Optional[int] = None,
    incluir_adormecidos: bool = False,
    db_main: Session = Depends(get_db),
    db_treasury: Session = Depends(get_treasury_db)
):
    """Listar situação financeira dos irmãos contribuintes da Loja."""
    return _calcular_financeiro_irmaos_logic(loja_id, mes, ano, incluir_adormecidos, db_main, db_treasury)

def _calcular_financeiro_irmaos_logic(loja_id, mes, ano, incluir_adormecidos, db_main, db_treasury):
    try:
        from sqlalchemy import text
        from datetime import datetime, date

        # Data alvo para cálculos (se não informado, usa hoje)
        hoje = date.today()
        if not mes or not ano:
            alvo = hoje
        else:
            alvo = date(int(ano), int(mes), 1)

        query_pessoas = text("""
            SELECT p.id, p.nome, c.nome AS cargo_nome, p.data_admissao, p.ativo, p.data_adormecimento, p.tipo_ingresso, p.data_iniciacao,
                   p.joia_quitada_externa, p.isencao_inicio, p.login, p.status, p.tipo_pessoa, p.telefone
            FROM pessoas p
            LEFT JOIN cargos c ON p.cargo_id = c.id
            WHERE p.loja_id = :lid
              AND (c.isento_contribuicao = 0 OR c.isento_contribuicao IS NULL)
              AND (:incl_adorm = 1 OR (COALESCE(p.data_adormecimento, '') = '' AND COALESCE(p.ativo, 1) = 1))
            ORDER BY c.id, p.nome
        """)
        pessoas_rows = db_treasury.execute(query_pessoas, {"lid": loja_id, "incl_adorm": 1 if incluir_adormecidos else 0}).fetchall()

        pessoas = list(pessoas_rows)

        res = []
        for p in pessoas:
            pid, nome, cargo_nome = p[0], p[1], (p[2] or "")
            data_adm_original = p[3]
            ativo = p[4]
            data_adormecimento = p[5]
            tipo_ingresso = p[6]
            data_iniciacao = p[7]
            joia_quitada_externa = bool(p[8])
            isencao_inicio = bool(p[9])
            p_status = (p[11] or "").strip()
            p_tipo = (p[12] or "obreiro").strip()
            p_telefone = (p[13] or "").strip()

            # Prioriza data_iniciacao (campo do cadastro) como única fonte da verdade
            data_ref_calc = data_iniciacao if data_iniciacao else data_adm_original
            data_adm_str = data_ref_calc # Usado no resto do cálculo


            # 0. Buscar exceções cadastradas para esse obreiro (incluindo JOIA)
            excecoes_rows = db_treasury.execute(text(
                "SELECT id, mes_ref, justificativa FROM mensalidade_excecoes WHERE pessoa_id = :pid"
            ), {"pid": pid}).fetchall()
            excecoes_map = {r[1]: {"id": r[0], "justificativa": r[2]} for r in excecoes_rows}

            # 1. JOIA (Total de R$ 2.000)
            j_paga_real = db_treasury.execute(text(
                "SELECT COALESCE(SUM(valor),0) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'joia' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]
            j_paga_real = float(j_paga_real or 0.0)
            
            is_transferencia = (tipo_ingresso == 'transferencia')
            j_paga_exibicao = j_paga_real
            j_pend = 0.0

            if is_transferencia:
                # Isento de Joia
                j_pend = 0.0
                j_paga_exibicao = 0.0
            elif joia_quitada_externa:
                # Pago em outro banco (Somente via Checkbox Global)
                j_pend = 0.0
                j_paga_exibicao = 2000.0
            else:
                # Fluxo normal (Joia 2000)
                if tipo_ingresso == 'transferencia':
                    j_pend = 0.0
                    j_paga_exibicao = j_paga_real # Se pagou algo, mostra, mas dívida é zero
                else:
                    j_pend = max(0.0, 2000.0 - j_paga_real)
                    j_paga_exibicao = j_paga_real

            # 2. MENSALIDADE
            m_pagas_reais_count = db_treasury.execute(text(
                "SELECT COUNT(id) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'mensalidade' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]
            m_pagas_reais_count = int(m_pagas_reais_count or 0)
            
            # Valor real em dinheiro que entrou no sistema
            m_paga_real_dinheiro = db_treasury.execute(text(
                "SELECT COALESCE(SUM(valor),0) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'mensalidade' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]
            m_paga_real_dinheiro = float(m_paga_real_dinheiro or 0.0)

            # Contar meses ignorados (exceções) que não são JOIA
            m_ignoradas_count = sum(1 for ref in excecoes_map if ref != 'JOIA')
            
            # NOVO: Para Mensalidade, o valor pago é APENAS o dinheiro real.
            # O "ignorar" apenas remove a dívida, não conta como dinheiro pago.
            m_paga_total = m_paga_real_dinheiro
            m_paga_justificada = 0.0 # Revertido: não somamos justificativa no total de mensalidade
            m_pagas_count = m_pagas_reais_count # Contamos apenas meses com transação real

            meses_devidos = 0
            m_pend = 0.0
            detalhes_meses = [] # Para o botão de detalhamento solicitado

            # Adicionar Joia no início do detalhamento
            if joia_quitada_externa:
                detalhes_meses.append({
                    "mes_ref": "JOIA",
                    "label": "JOIA (Taxa de Ingresso)",
                    "ignorado": True,
                    "excecao_id": None,
                    "justificativa": "Pago para outra conta (via Checkbox)",
                    "status": "justificado"
                })
            elif tipo_ingresso == 'transferencia':
                # Isento por transferência (não deve cobrar)
                detalhes_meses.append({
                    "mes_ref": "JOIA",
                    "label": "JOIA (Taxa de Ingresso)",
                    "ignorado": True,
                    "excecao_id": None,
                    "justificativa": "Isento (Transferência de outra Loja)",
                    "status": "isento"
                })
            elif j_pend > 0:
                detalhes_meses.append({
                    "mes_ref": "JOIA",
                    "label": "JOIA (Taxa de Ingresso)",
                    "ignorado": False,
                    "excecao_id": None,
                    "justificativa": None,
                    "status": "pendente"
                })
            else:
                # Caso onde j_pend é 0 (pago via sistema)
                detalhes_meses.append({
                    "mes_ref": "JOIA",
                    "label": "JOIA (Taxa de Ingresso)",
                    "ignorado": False,
                    "excecao_id": None,
                    "justificativa": "Pago (Lançamento no sistema)",
                    "status": "pago"
                })

            if data_adm_str:


                try:
                    # Tenta converter a data (suporta YYYY-MM-DD e DD/MM/YYYY)
                    d_str = str(data_adm_str).strip()
                    try:
                        data_adm = datetime.strptime(d_str, "%Y-%m-%d").date()
                    except ValueError:
                        try:
                            data_adm = datetime.strptime(d_str, "%D/%M/%Y").date()
                        except ValueError:
                            # Fallback para DD/MM/YYYY com %d/%m/%Y
                            data_adm = datetime.strptime(d_str, "%d/%m/%Y").date()
                    
                    alvo_limite = date(alvo.year, alvo.month, 1)

                    # NOVO: Candidatos não pagam mensalidade até serem iniciados
                    # Usamos o tipo de cadastro (tipo_pessoa) como fonte da verdade
                    is_candidato_tipo = (p_tipo == 'candidato')
                    
                    if is_candidato_tipo:
                        # Pula o cálculo de mensalidades (loop não será executado)
                        data_adm = date(3000, 1, 1) # Data no futuro distante
                    
                    # Regra de início de cobrança: Michel quer que SEMPRE cobre o mês de iniciação por default
                    # EXCETO se a iniciação for após o dia 15
                    if data_adm.day > 15:
                        if data_adm.month == 12:
                            inicio_cobranca = date(data_adm.year + 1, 1, 1)
                        else:
                            inicio_cobranca = date(data_adm.year, data_adm.month + 1, 1)
                    else:
                        inicio_cobranca = date(data_adm.year, data_adm.month, 1)
                    
                    curr = inicio_cobranca
                    # Alvo limite agora é sempre o primeiro dia do mês alvo (Maio/2026 neste caso)
                    alvo_limite = date(alvo.year, alvo.month, 1)
                    
                    if data_adormecimento and not ativo:
                        try:
                            d_ador_str = str(data_adormecimento).strip()
                            try:
                                data_adorm = datetime.strptime(d_ador_str, "%Y-%m-%d").date()
                            except:
                                data_adorm = datetime.strptime(d_ador_str, "%d/%m/%Y").date()
                            alvo_limite = min(alvo_limite, date(data_adorm.year, data_adorm.month, 1))
                        except: pass

                    # LOGICA DE CRÉDITO: Abater meses do valor total pago
                    saldo_mensalidade = m_paga_real_dinheiro
                    valor_mensalidade = 250.0 # Valor padrão
                    m_pagas_count_calc = 0
                    
                    while curr <= alvo_limite:
                        mes_ref_str = curr.strftime("%Y-%m")
                        label_mes = f"{MESES_PT[curr.month]}/{curr.year}"
                        is_mes_isento_inicio = (mes_ref_str == inicio_cobranca.strftime("%Y-%m") and isencao_inicio)
                        
                        # 1. Verifica se é exceção manual (Histórico)
                        if mes_ref_str in excecoes_map:
                            exc = excecoes_map[mes_ref_str]
                            detalhes_meses.append({
                                "mes_ref": mes_ref_str, "label": label_mes,
                                "ignorado": True, "excecao_id": exc["id"],
                                "justificativa": exc["justificativa"], "status": "justificado"
                            })
                            m_paga_justificada += valor_mensalidade
                        
                        # 2. Verifica se é isento pelo flag global
                        elif is_mes_isento_inicio:
                            detalhes_meses.append({
                                "mes_ref": mes_ref_str, "label": label_mes,
                                "ignorado": True, "excecao_id": None,
                                "justificativa": "Isento (Mês de Iniciação)", "status": "isento"
                            })

                        # 3. Verifica se o saldo cobre este mês
                        elif saldo_mensalidade >= valor_mensalidade:
                            detalhes_meses.append({
                                "mes_ref": mes_ref_str, "label": label_mes,
                                "ignorado": False, "excecao_id": None,
                                "justificativa": "Pago (Saldo de Mensalidades)", "status": "pago"
                            })
                            saldo_mensalidade -= valor_mensalidade
                            m_pagas_count_calc += 1
                        
                        # 4. Caso contrário, está PENDENTE
                        else:
                            meses_devidos += 1
                            m_pend += valor_mensalidade
                            detalhes_meses.append({
                                "mes_ref": mes_ref_str, "label": label_mes,
                                "ignorado": False, "excecao_id": None,
                                "justificativa": None, "status": "pendente"
                            })
                        
                        # Incremento seguro do mês
                        if curr.month == 12: curr = date(curr.year + 1, 1, 1)
                        else: curr = date(curr.year, curr.month + 1, 1)
                        
                    total_meses_devidos_ate_hoje = meses_devidos + m_pagas_count_calc
                except Exception as ex:
                    print(f"ERRO no cálculo de mensalidade para pessoa {pid}: {ex}")

            # 3. SAÚDE FINANCEIRA
            # Se qualquer justificativa mencionar 'joia', zeramos a pendencia da joia
            # Fazemos isso ANTES de calcular a saúde para que o status REGULAR seja possível
            for exc in excecoes_map.values():
                if 'joia' in (exc['justificativa'] or '').lower():
                    j_pend = 0.0
                    break

            saude = "REGULAR"
            if m_pend > 0:
                tem_atraso_real = False
                for d in detalhes_meses:
                    if d.get("ignorado") or d.get("status") == "pago": continue # Pula os verdes e pagos
                    if d["mes_ref"] == "JOIA": continue # Pula a Joia, pois não é data
                    d_mes = datetime.strptime(d["mes_ref"], "%Y-%m").date()
                    if d_mes < date(hoje.year, hoje.month, 1) or (d_mes == date(hoje.year, hoje.month, 1) and hoje.day > 10):
                        tem_atraso_real = True
                        break
                saude = "ATRASADO" if tem_atraso_real else "PENDENTE"
            elif j_pend > 0:
                saude = "PENDENTE"
            
            # Se o mês alvo (selecionado no filtro) está justificado, força REGULAR para aquele contexto
            target_ref = alvo.strftime("%Y-%m")
            if target_ref in excecoes_map and m_pend == 0 and j_pend == 0:
                saude = "REGULAR"

            # Cálculo de Joia Justificada (para exibir na tabela se necessário)
            j_justificada = 0.0
            if 'JOIA' in excecoes_map:
                j_justificada = max(0.0, 2000.0 - j_paga_real)

            res.append({
                "id": pid,
                "nome": nome,
                "cargo": cargo_nome,
                "data_admissao": str(data_adm_str) if data_adm_str else None,
                "data_adormecimento": str(data_adormecimento) if data_adormecimento else None,
                "ativo": int(ativo) if ativo is not None else 1,
                "tipo_ingresso": tipo_ingresso,
                "meses_cobrados": total_meses_devidos_ate_hoje if 'total_meses_devidos_ate_hoje' in locals() else 0,
                "meses_devidos": meses_devidos,
                "meses_pagos": int(m_pagas_count),
                "joia_paga": float(j_paga_exibicao),
                "joia_real": float(j_paga_real),
                "joia_justificada": float(j_justificada),
                "joia_pendente": float(j_pend),
                "mensalidade_paga": float(m_paga_total),
                "mensalidade_real": float(m_paga_real_dinheiro),
                "mensalidade_justificada": float(m_paga_justificada),
                "mensalidade_pendente": float(m_pend),
                "saude_financeira": saude,
                "meses_atraso": detalhes_meses,
                "meses_lista_aberto": [m['label'] for m in detalhes_meses if m.get('status') == 'pendente'],
                "joia_quitada_externa": joia_quitada_externa,
                "isencao_inicio": isencao_inicio,
                "tipo_pessoa": p_tipo,
                "telefone": p_telefone
            })

        return res
    except Exception as e:
        print(f"ERRO AO LISTAR FINANCEIRO IRMAOS: {e}")
        import traceback
        print(traceback.format_exc())
        return []

# ─── ENDPOINTS DE EXCEÇÕES DE MENSALIDADE ─────────────────────────────────────

class ExcecaoCreate(BaseModel):
    pessoa_id: int
    mes_ref: str  # YYYY-MM
    justificativa: Optional[str] = None
    usuario_id: Optional[int] = None

@router.post("/excecoes")
def criar_excecao(
    body: ExcecaoCreate,
    db_treasury: Session = Depends(get_treasury_db)
):
    """Registra uma exceção para um mês de mensalidade (ignorar cobrança)."""
    try:
        from sqlalchemy import text
        from datetime import datetime
        # Evitar duplicatas
        exists = db_treasury.execute(text(
            "SELECT id FROM mensalidade_excecoes WHERE pessoa_id = :pid AND mes_ref = :mr"
        ), {"pid": body.pessoa_id, "mr": body.mes_ref}).fetchone()
        if exists:
            return {"id": exists[0], "message": "ja existe"}
        
        db_treasury.execute(text(
            "INSERT INTO mensalidade_excecoes (pessoa_id, mes_ref, justificativa, criado_por_id, criado_em) VALUES (:pid, :mr, :just, :uid, :em)"
        ), {
            "pid": body.pessoa_id,
            "mr": body.mes_ref,
            "just": body.justificativa,
            "uid": body.usuario_id,
            "em": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        db_treasury.commit()
        new_id = db_treasury.execute(text(
            "SELECT id FROM mensalidade_excecoes WHERE pessoa_id = :pid AND mes_ref = :mr"
        ), {"pid": body.pessoa_id, "mr": body.mes_ref}).fetchone()[0]
        return {"id": new_id, "message": "criado"}
    except Exception as e:
        db_treasury.rollback()
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/excecoes/{excecao_id}")
def remover_excecao(
    excecao_id: int,
    db_treasury: Session = Depends(get_treasury_db)
):
    """Remove uma exceção de mensalidade."""
    try:
     @router.get("/relatorio/inadimplentes/{loja_id}")
def relatorio_inadimplentes(
    loja_id: int,
    incluir_adormecidos: bool = False,
    db_main: Session = Depends(get_db),
    db_treasury: Session = Depends(get_treasury_db)
):
    """Gera um relatório CSV consolidado de irmãos inadimplentes."""
    # Obter dados financeiros respeitando o filtro de adormecidos do usuário
    dados = _calcular_financeiro_irmaos_logic(loja_id, None, None, incluir_adormecidos, db_main, db_treasury)
    
    # Filtrar apenas inadimplentes (Atrasados ou Pendentes)
    inadimplentes = [d for d in dados if d['saude_financeira'] in ['ATRASADO', 'PENDENTE']]
    
    output = io.StringIO()
    # Usar BOM para o Excel abrir corretamente com acentos
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';')
    
    # Cabeçalho
    writer.writerow(['Obreiro', 'WhatsApp', 'Cargo', 'Status', 'Iniciação', 'Joia Devida', 'Mensalidade Devida', 'Meses em Aberto', 'Saúde Financeira'])
    
    for d in inadimplentes:
        meses_aberto = ", ".join(d.get('meses_lista_aberto', []))
        if meses_aberto:
            meses_aberto = " " + meses_aberto
            
        status_txt = "Ativo" if d['ativo'] == 1 else f"Adormecido ({d['data_adormecimento']})"
        
        writer.writerow([
            d['nome'],
            d['telefone'],
            d['cargo'],
            status_txt,
            d['data_admissao'],
            f"R$ {d['joia_pendente']:.2f}",
            f"R$ {d['mensalidade_pendente']:.2f}",
            meses_aberto,
            d['saude_financeira']
        ])
    
    output.seek(0)
    headers = {
        'Content-Disposition': f'attachment; filename="inadimplentes_loja_{loja_id}_{datetime.now().strftime("%Y%m%d")}.csv"'
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/relatorio/financeiro")
def relatorio_financeiro(
    loja_id: int, 
    tipo: Optional[str] = None, 
    status: Optional[str] = None, 
    mes: Optional[int] = None, 
    ano: Optional[int] = None,
    caixa_id: Optional[int] = 0,
    db_treasury: Session = Depends(get_treasury_db),
    db_main: Session = Depends(get_db)
):
    """Gera um relatório financeiro em lote (HTML) para impressão."""
    # 1. Buscar dados da Loja
    loja = db_main.execute(text("SELECT nome, numero FROM lojas WHERE id = :lid"), {"lid": loja_id}).fetchone()
    l_nome = loja[0] if loja else "Portal da Ordem"
    l_num = loja[1] if loja else ""
    
    # 2. Construir Query de Transações
    query_base = """
        SELECT t.id, t.descricao, t.valor, t.tipo, t.categoria, t.data_vencimento, t.data_pagamento, 
               t.status, t.pessoa_id, c.nome as caixa_nome
        FROM transacoes t
        JOIN caixas c ON t.caixa_id = c.id
        WHERE c.loja_id = :lid
    """
    params = {"lid": loja_id}
    
    if tipo:
        query_base += " AND t.tipo = :tipo"
        params["tipo"] = tipo
    if status:
        query_base += " AND t.status = :status"
        params["status"] = status
    if mes and ano:
        query_base += " AND ( (MONTH(t.data_vencimento) = :mes AND YEAR(t.data_vencimento) = :ano) OR (t.mes_referencia = :mes_ref) )"
        params["mes"] = mes
        params["ano"] = ano
        params["mes_ref"] = f"{ano}-{mes:02d}"
    if caixa_id and int(caixa_id) > 0:
        query_base += " AND t.caixa_id = :cid"
        params["cid"] = caixa_id
        
    query_base += " ORDER BY t.data_vencimento ASC"
    rows = db_treasury.execute(text(query_base), params).fetchall()
    
    # 3. Processar Linhas para o HTML
    total_valor = 0
    table_rows_html = ""
    for r in rows:
        t_id, desc, valor, t_tipo, cat, venc, pagto, t_status, p_id, c_nome = r
        total_valor += valor
        p_nome = "---"
        if p_id:
            if p_id < 0:
                p = db_treasury.execute(text("SELECT nome FROM usuarios WHERE id = :id"), {"id": abs(p_id)}).fetchone()
            else:
                p = db_treasury.execute(text("SELECT nome FROM pessoas WHERE id = :id"), {"id": p_id}).fetchone()
            if p: p_nome = p[0]

        data_exibicao = datetime.strptime(venc, "%Y-%m-%d").strftime("%d/%m/%Y") if venc else "-"
        status_color = "#16a34a" if t_status == 'pago' else "#ca8a04"
        status_label = "PAGO" if t_status == 'pago' else "PENDENTE"
        tipo_color = "#16a34a" if t_tipo == 'entrada' else "#dc2626"
        
        table_rows_html += f"""
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-size: 12px;">#{t_id}</td>
                <td style="padding: 10px; font-size: 12px;">{data_exibicao}</td>
                <td style="padding: 10px; font-size: 12px; font-weight: 500;">{desc}</td>
                <td style="padding: 10px; font-size: 11px; color: #666;">{p_nome}</td>
                <td style="padding: 10px; font-size: 12px; font-weight: bold; color: {tipo_color}; text-align: right;">R$ {valor:,.2f}</td>
                <td style="padding: 10px; font-size: 10px; font-weight: bold; color: {status_color}; text-align: center;">{status_label}</td>
            </tr>
        """

    formatted_total = f"{total_valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    titulo_relatorio = "Relatório de Movimentações"
    if tipo == 'saida' and status == 'pendente': titulo_relatorio = "Contas a Pagar"
    elif tipo == 'entrada' and status == 'pendente': titulo_relatorio = "Contas a Receber"
    elif status == 'pago': titulo_relatorio = "Fluxo de Caixa (Efetivados)"

    html = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>{titulo_relatorio}</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 30px; background: #fff; }}
            .header {{ text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }}
            .header h1 {{ margin: 0; font-size: 22px; text-transform: uppercase; }}
            .header p {{ margin: 5px 0; font-size: 14px; color: #666; font-weight: bold; }}
            .info-bar {{ display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; background: #f9f9f9; padding: 10px; border-radius: 5px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            th {{ background: #f0f0f0; text-align: left; padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #555; border-bottom: 2px solid #ddd; }}
            .total-box {{ margin-top: 30px; text-align: right; border-top: 2px solid #000; padding-top: 15px; }}
            .total-label {{ font-size: 16px; font-weight: bold; }}
            .total-value {{ font-size: 24px; font-weight: 900; margin-left: 20px; }}
            .footer {{ margin-top: 40px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }}
            @media print {{
                .no-print {{ display: none; }}
                body {{ margin: 0; }}
            }}
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #ca8a04; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">🖨️ IMPRIMIR RELATÓRIO</button>
        </div>
        <div class="header">
            <h1>{l_nome} {f"Nº {l_num}" if l_num else ""}</h1>
            <p>{titulo_relatorio.upper()}</p>
        </div>
        <div class="info-bar">
            <span>Período: {f"{mes:02d}/{ano}" if mes and ano else "Geral"}</span>
            <span>Emitido em: {datetime.now().strftime("%d/%m/%Y %H:%M")}</span>
            <span>Loja ID: #{loja_id}</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th>ID</th><th>Data</th><th>Descrição / Motivo</th><th>Obreiro</th><th style="text-align: right;">Valor</th><th style="text-align: center;">Status</th>
                </tr>
            </thead>
            <tbody>{table_rows_html}</tbody>
        </table>
        <div class="total-box">
            <span class="total-label">VALOR TOTAL ACUMULADO NO PERÍODO:</span>
            <span class="total-value">R$ {formatted_total}</span>
        </div>
        <div class="footer">
            Relatório gerado automaticamente pelo Sistema Portal da Ordem.<br>
            A validade deste documento está sujeita à conferência nos registros oficiais.
        </div>
    </body>
    </html>
    """
    return Response(content=html, media_type='text/html')

@router.get("/relatorio/individual/{transacao_id}")
def relatorio_individual(transacao_id: int, db_treasury: Session = Depends(get_treasury_db)):
    """Gera um recibo/relatório individual formatado para impressão."""
    query = """
        SELECT t.id, t.descricao, t.valor, t.tipo, t.categoria, t.data_vencimento, t.data_pagamento, 
               t.notas, t.pessoa_id, c.nome as caixa_nome, l.nome as loja_nome, l.numero as loja_numero
        FROM transacoes t
        JOIN caixas c ON t.caixa_id = c.id
        JOIN lojas l ON c.loja_id = l.id
        WHERE t.id = :tid
    """
    row = db_treasury.execute(text(query), {"tid": transacao_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    
    t_id, desc, valor, tipo, cat, ref, pagto, notas, p_id, c_nome, l_nome, l_num = row
    p_nome = "---"
    if p_id:
        if p_id < 0:
            p = db_treasury.execute(text("SELECT nome FROM usuarios WHERE id = :id"), {"id": abs(p_id)}).fetchone()
        else:
            p = db_treasury.execute(text("SELECT nome FROM pessoas WHERE id = :id"), {"id": p_id}).fetchone()
        if p: p_nome = p[0]
    
    data_ref = datetime.strptime(ref, "%Y-%m-%d").strftime("%m/%Y") if ref else "-"
    data_pag = datetime.strptime(pagto, "%Y-%m-%d").strftime("%d/%m/%Y") if pagto else (datetime.strptime(ref, "%Y-%m-%d").strftime("%d/%m/%Y") if ref else "-")
    formatted_valor = f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    html = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>Recibo de Lançamento #{t_id}</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 40px; line-height: 1.6; background: #f9f9f9; }}
            .container {{ max-width: 800px; margin: auto; background: #fff; padding: 40px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); border: 1px solid #eee; }}
            .header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }}
            .header h1 {{ margin: 0; font-size: 24px; text-transform: uppercase; color: #000; }}
            .header p {{ margin: 5px 0; font-size: 14px; font-weight: bold; color: #666; }}
            .content {{ position: relative; }}
            .row {{ display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px dashed #eee; padding-bottom: 10px; }}
            .label {{ font-weight: bold; text-transform: uppercase; font-size: 11px; color: #888; }}
            .value {{ font-size: 15px; font-weight: 600; color: #222; }}
            .valor-box {{ background: #fdfdfd; padding: 20px; border: 2px solid #000; margin-top: 30px; display: flex; justify-content: space-between; align-items: center; }}
            .valor-label {{ font-size: 18px; font-weight: bold; color: #000; }}
            .valor-value {{ font-size: 28px; font-weight: 900; color: #000; }}
            .footer {{ margin-top: 50px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }}
            .signature-area {{ margin-top: 60px; display: flex; justify-content: space-around; }}
            .signature-box {{ border-top: 1px solid #333; width: 250px; text-align: center; padding-top: 10px; font-size: 12px; font-weight: bold; }}
            .watermark {{ position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(0,0,0,0.03); font-weight: bold; pointer-events: none; text-transform: uppercase; }}
            @media print {{ .no-print {{ display: none; }} body {{ margin: 0; background: #fff; }} .container {{ border: none; box-shadow: none; max-width: 100%; width: 100%; }} }}
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right; max-width: 800px; margin: 0 auto 20px auto;">
            <button onclick="window.print()" style="padding: 12px 25px; background: #ca8a04; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 900; text-transform: uppercase;">🖨️ Imprimir Comprovante</button>
        </div>
        <div class="container">
            <div class="watermark">PORTAL DA ORDEM</div>
            <div class="header"><h1>{l_nome} {f"Nº {l_num}" if l_num else ""}</h1><p>COMPROVANTE DE MOVIMENTAÇÃO FINANCEIRA</p></div>
            <div class="content">
                <div class="row"><span class="label">Controle Interno</span><span class="value">#{t_id}</span></div>
                <div class="row"><span class="label">Descrição</span><span class="value">{desc}</span></div>
                <div class="row"><span class="label">Categoria</span><span class="value">{cat.upper()}</span></div>
                <div class="row"><span class="label">Tipo</span><span class="value" style="color: {'#16a34a' if tipo == 'entrada' else '#dc2626'}">{tipo.upper()}</span></div>
                <div class="row"><span class="label">Obreiro</span><span class="value">{p_nome}</span></div>
                <div class="row"><span class="label">Referência</span><span class="value">{data_ref}</span></div>
                <div class="row"><span class="label">Pagamento</span><span class="value">{data_pag}</span></div>
                <div class="row"><span class="label">Conta</span><span class="value">{c_nome}</span></div>
                <div class="valor-box"><span class="valor-label">VALOR TOTAL</span><span class="valor-value">R$ {formatted_valor}</span></div>
                {f'<div style="margin-top: 25px; background: #fcfcfc; padding: 15px; border-left: 4px solid #eee;"><span class="label">Observações:</span><p style="margin: 5px 0 0 0; font-size: 13px; color: #444; font-style: italic;">{notas}</p></div>' if notas else ''}
                <div class="signature-area"><div class="signature-box">TESOURARIA</div><div class="signature-box">BENEFICIÁRIO / PAGADOR</div></div>
            </div>
            <div class="footer">Gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")} via Portal da Ordem.</div>
        </div>
    </body>
    </html>
    """
    return Response(content=html, media_type='text/html')
