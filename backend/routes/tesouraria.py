import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Caixa, Transacao, Pessoa, Loja, Usuario
from datetime import datetime

UPLOAD_DIR = "static/uploads/comprovantes"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

class CaixaResponse(BaseModel):
    id: int
    nome: str
    saldo_atual: float

    class Config:
        from_attributes = True

class TransacaoResponse(BaseModel):
    id: int
    caixa_id: int
    pessoa_id: Optional[int] = None
    pessoa_nome: Optional[str] = None
    tipo: str
    categoria: str
    valor: float
    data_vencimento: str
    data_pagamento: Optional[str] = None
    descricao: str
    notas: Optional[str] = None
    anexo_url: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

class TransacaoUpdate(BaseModel):
    status: Optional[str] = None
    data_pagamento: Optional[str] = None
    notas: Optional[str] = None
    anexo_url: Optional[str] = None

class ResumoFinanceiro(BaseModel):
    caixas: List[CaixaResponse]
    total_entrada_pendente: float
    total_saida_pendente: float

    class Config:
        from_attributes = True

@router.post("/transacoes/", response_model=TransacaoResponse)
async def criar_transacao(
    caixa_id: int = Form(...),
    pessoa_id: Optional[int] = Form(None),
    usuario_id: int = Form(...),
    tipo: str = Form(...),
    categoria: str = Form(...),
    valor: float = Form(...),
    data_vencimento: str = Form(...),
    data_pagamento: Optional[str] = Form(None),
    descricao: str = Form(...),
    notas: Optional[str] = Form(None),
    status: Optional[str] = Form("pendente"),
    comprovante: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    caixa = db.query(Caixa).filter(Caixa.id == caixa_id).first()
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado")
    
    anexo_url = None
    if comprovante:
        ext = os.path.splitext(comprovante.filename)[1]
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"recibo_{timestamp}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(comprovante.file, buffer)
        
        anexo_url = f"/static/uploads/comprovantes/{filename}"

    nova_transacao = Transacao(
        caixa_id=caixa_id,
        pessoa_id=pessoa_id,
        usuario_id=usuario_id,
        tipo=tipo,
        categoria=categoria,
        valor=valor,
        data_vencimento=data_vencimento,
        data_pagamento=data_pagamento,
        descricao=descricao,
        notas=notas,
        anexo_url=anexo_url,
        status=status
    )
    
    # Update balance if already paid
    if nova_transacao.status == "pago":
        if nova_transacao.tipo == "entrada":
            caixa.saldo_atual += nova_transacao.valor
        else:
            caixa.saldo_atual -= nova_transacao.valor
            
    db.add(nova_transacao)
    db.commit()
    db.refresh(nova_transacao)
    
    return TransacaoResponse(
        id=nova_transacao.id,
        caixa_id=nova_transacao.caixa_id,
        pessoa_id=nova_transacao.pessoa_id,
        pessoa_nome=nova_transacao.pessoa.nome if nova_transacao.pessoa else None,
        tipo=nova_transacao.tipo,
        categoria=nova_transacao.categoria,
        valor=nova_transacao.valor,
        data_vencimento=nova_transacao.data_vencimento,
        data_pagamento=nova_transacao.data_pagamento,
        descricao=nova_transacao.descricao,
        notas=nova_transacao.notas,
        anexo_url=nova_transacao.anexo_url,
        status=nova_transacao.status
    )

@router.patch("/transacoes/{transacao_id}", response_model=TransacaoResponse)
def atualizar_transacao(transacao_id: int, dados: TransacaoUpdate, db: Session = Depends(get_db)):
    transacao = db.query(Transacao).filter(Transacao.id == transacao_id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    caixa = transacao.caixa
    
    # Logic for balance update when status changes to 'pago'
    if dados.status == "pago" and transacao.status != "pago":
        if transacao.tipo == "entrada":
            caixa.saldo_atual += transacao.valor
        else:
            caixa.saldo_atual -= transacao.valor
        transacao.status = "pago"
        if not dados.data_pagamento:
             transacao.data_pagamento = datetime.now().strftime("%Y-%m-%d")
    
    if dados.data_pagamento is not None:
        transacao.data_pagamento = dados.data_pagamento
    if dados.notas is not None:
        transacao.notas = dados.notas
    if dados.anexo_url is not None:
        transacao.anexo_url = dados.anexo_url
        
    db.commit()
    db.refresh(transacao)
    
    return TransacaoResponse(
        id=transacao.id,
        caixa_id=transacao.caixa_id,
        pessoa_id=transacao.pessoa_id,
        pessoa_nome=transacao.pessoa.nome if transacao.pessoa else None,
        tipo=transacao.tipo,
        categoria=transacao.categoria,
        valor=transacao.valor,
        data_vencimento=transacao.data_vencimento,
        data_pagamento=transacao.data_pagamento,
        descricao=transacao.descricao,
        notas=transacao.notas,
        anexo_url=transacao.anexo_url,
        status=transacao.status
    )

@router.get("/resumo/{loja_id}", response_model=ResumoFinanceiro)
def resumo_financeiro(loja_id: int, db: Session = Depends(get_db)):
    try:
        caixas = db.query(Caixa).filter(Caixa.loja_id == loja_id).all()
        
        # Calculate pendencies
        transacoes_pendentes = db.query(Transacao).join(Caixa).filter(Caixa.loja_id == loja_id, Transacao.status == 'pendente').all()
        
        ent_pend = sum(t.valor for t in transacoes_pendentes if t.tipo == 'entrada')
        sai_pend = sum(t.valor for t in transacoes_pendentes if t.tipo == 'saida')
        
        return ResumoFinanceiro(
            caixas=caixas,
            total_entrada_pendente=ent_pend,
            total_saida_pendente=sai_pend
        )
    except Exception as e:
        print(f"Erro ao carregar resumo financeiro (provavelmente tabelas ausentes): {e}")
        return ResumoFinanceiro(
            caixas=[],
            total_entrada_pendente=0,
            total_saida_pendente=0
        )

class IrmaoFinanceiro(BaseModel):
    id: int
    nome: str
    joia_paga: float
    joia_pendente: float
    mensalidade_paga: float
    mensalidade_pendente: float

@router.get("/irmaos/{loja_id}", response_model=List[IrmaoFinanceiro])
def listar_financeiro_irmaos(loja_id: int, db: Session = Depends(get_db)):
    try:
        pessoas = db.query(Pessoa).filter(Pessoa.loja_id == loja_id).all()
        
        response = []
        for p in pessoas:
            try:
                # Sum transactions for this brother
                transacoes = db.query(Transacao).filter(Transacao.pessoa_id == p.id).all()
                
                joia_p = sum(t.valor for t in transacoes if t.categoria == 'joia' and t.status == 'pago')
                joia_pend = sum(t.valor for t in transacoes if t.categoria == 'joia' and t.status == 'pendente')
                
                mensal_p = sum(t.valor for t in transacoes if t.categoria == 'mensalidade' and t.status == 'pago')
                mensal_pend = sum(t.valor for t in transacoes if t.categoria == 'mensalidade' and t.status == 'pendente')
            except:
                joia_p = joia_pend = mensal_p = mensal_pend = 0
            
            response.append(IrmaoFinanceiro(
                id=p.id,
                nome=p.nome,
                joia_paga=joia_p,
                joia_pendente=joia_pend,
                mensalidade_paga=mensal_p,
                mensalidade_pendente=mensal_pend
            ))
        return response
    except Exception as e:
        print(f"Erro ao carregar financeiro de irmãos: {e}")
        return []

