import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db, get_treasury_db, TREASURY_DB_URL
from models import Transacao, Pessoa, Caixa
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

class CaixaCreate(BaseModel):
    loja_id: int
    nome: str
    tipo: str = "geral" 
    descricao: Optional[str] = None
    saldo_inicial: float = 0.0

@router.get("/diagnostic")
def diagnostic(db_treasury: Session = Depends(get_treasury_db)):
    """Rota de diagnóstico para depuração de unificação MySQL."""
    import os
    from database import TREASURY_DB_URL
    from models import Transacao, Pessoa, Caixa
    
    try:
        t_count = db_treasury.query(Transacao).count()
        p_count = db_treasury.query(Pessoa).count()
        c_count = db_treasury.query(Caixa).count()
        return {
            "db_url": TREASURY_DB_URL,
            "trans_count": t_count,
            "pessoas_count": p_count,
            "caixas_count": c_count,
            "cwd": os.getcwd(),
            "mysql_status": "OK"
        }
    except Exception as e:
        return {"error": str(e), "db_url": TREASURY_DB_URL}

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
    descricao: Optional[str] = None
    notas: Optional[str] = None
    anexo_url: Optional[str] = None
    status: Optional[str] = 'pendente'
    pessoa_nome: Optional[str] = "N/A"
    caixa_nome: Optional[str] = "Geral"
    
    class Config:
        from_attributes = True

class TransacaoUpdate(BaseModel):
    status: Optional[str] = None
    data_pagamento: Optional[str] = None
    notas: Optional[str] = None
    anexo_url: Optional[str] = None
    descricao: Optional[str] = None
    valor: Optional[float] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None

class ResumoFinanceiro(BaseModel):
    caixas: List[CaixaResponse] = []
    total_entrada_pendente: float = 0.0
    total_saida_pendente: float = 0.0
    saldo_geral: float = 0.0
    saldo_benevolencia: float = 0.0
    saldo_joias_mensalidade: float = 0.0

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
    descricao: str = Form(...),
    notas: Optional[str] = Form(None),
    status: Optional[str] = Form("pendente"),
    comprovante: Optional[UploadFile] = File(None),
    db_main: Session = Depends(get_db),
    db_treasury: Session = Depends(get_treasury_db)
):
    from sqlalchemy import text
    from models import Usuario

    caixa = db_treasury.query(Caixa).filter(Caixa.id == caixa_id).first()
    if not caixa:
        raise HTTPException(status_code=404, detail="Caixa não encontrado")

    # Garantir que usuario_id seja válido — fallback para o primeiro usuário existente
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
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(comprovante.file, buffer)
        anexo_url = f"/static/uploads/comprovantes/{filename}"

    nova_transacao = Transacao(
        caixa_id=caixa_id,
        pessoa_id=pessoa_id,
        usuario_id=uid_final,
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
    
    if nova_transacao.status == "pago":
        if nova_transacao.tipo == "entrada":
            caixa.saldo_atual += nova_transacao.valor
        else:
            caixa.saldo_atual -= nova_transacao.valor
            
    db_treasury.add(nova_transacao)
    db_treasury.commit()
    db_treasury.refresh(nova_transacao)
    
    p_nome = None
    if nova_transacao.pessoa_id:
        p = db_main.query(Pessoa).filter(Pessoa.id == nova_transacao.pessoa_id).first()
        p_nome = p.nome if p else None

    return TransacaoResponse(
        id=nova_transacao.id,
        caixa_id=nova_transacao.caixa_id,
        pessoa_id=nova_transacao.pessoa_id,
        pessoa_nome=p_nome,
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
def atualizar_transacao(transacao_id: int, dados: TransacaoUpdate, db_treasury: Session = Depends(get_treasury_db)):
    transacao = db_treasury.query(Transacao).filter(Transacao.id == transacao_id).first()
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
    
    # Handle balance updates if valor OR tipo changes while status is already 'pago'
    if transacao.status == "pago" and (dados.valor is not None or dados.tipo is not None):
        # 1. Reverse the current value
        if transacao.tipo == "entrada":
            caixa.saldo_atual -= transacao.valor
        else:
            caixa.saldo_atual += transacao.valor
        
        # 2. Apply new values
        if dados.valor is not None:
             transacao.valor = dados.valor
        if dados.tipo is not None:
             transacao.tipo = dados.tipo
             
        # 3. Apply the impact of the new values
        if transacao.tipo == "entrada":
            caixa.saldo_atual += transacao.valor
        else:
            caixa.saldo_atual -= transacao.valor
    elif dados.valor is not None:
         transacao.valor = dados.valor
    elif dados.tipo is not None:
         transacao.tipo = dados.tipo

    if dados.data_pagamento is not None:
        transacao.data_pagamento = dados.data_pagamento
    if dados.notas is not None:
        transacao.notas = dados.notas
    if dados.anexo_url is not None:
        transacao.anexo_url = dados.anexo_url
    if dados.descricao is not None:
        transacao.descricao = dados.descricao
    if dados.categoria is not None:
        transacao.categoria = dados.categoria
        
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
        descricao=transacao.descricao,
        notas=transacao.notas,
        anexo_url=transacao.anexo_url,
        status=transacao.status
    )

@router.delete("/transacoes/{transacao_id}")
def excluir_transacao(transacao_id: int, db_treasury: Session = Depends(get_treasury_db)):
    transacao = db_treasury.query(Transacao).filter(Transacao.id == transacao_id).first()
    if not transacao:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    # Reverse balance if paid
    if transacao.status == "pago":
        caixa = transacao.caixa
        if transacao.tipo == "entrada":
            caixa.saldo_atual -= transacao.valor
        else:
            caixa.saldo_atual += transacao.valor
            
    db_treasury.delete(transacao)
    db_treasury.commit()
    return {"status": "success", "message": "Transação excluída"}

@router.get("/transacoes/{caixa_id}")
def listar_transacoes(
    caixa_id: int, 
    mes: Optional[int] = None, 
    ano: Optional[int] = None, 
    status: Optional[str] = None,
    db_treasury: Session = Depends(get_treasury_db)
):
    try:
        db_treasury.expire_all()
        # Support for consolidated view (caixa_id = 0)
        from sqlalchemy import text
        raw_sql = "SELECT id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, data_pagamento, descricao, status FROM transacoes"
        print(f"DEBUG EXECUTING RAW SQL: {raw_sql}")
        rows = db_treasury.execute(text(raw_sql)).fetchall()
        print(f"DEBUG ROWS FOUND: {len(rows)}")
        
        res = []
        for r in rows:
            # Match person name manually for safety
            p_nome = "N/A"
            if r[2]: # pessoa_id
                p = db_treasury.execute(text("SELECT nome FROM pessoas WHERE id = :id"), {"id": r[2]}).fetchone()
                if p: p_nome = p[0]
            
            res.append({
                "id": r[0],
                "caixa_id": r[1],
                "pessoa_id": r[2],
                "usuario_id": r[3],
                "tipo": r[4],
                "categoria": r[5],
                "valor": r[6],
                "data_vencimento": r[7],
                "data_pagamento": r[8],
                "descricao": r[9],
                "status": r[10],
                "pessoa_nome": p_nome,
                "caixa_nome": "Geral"
            })
                
        return res
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

@router.get("/resumo/{loja_id}")
def resumo_financeiro(loja_id: int, db_treasury: Session = Depends(get_treasury_db)):
    """Resumo financeiro dinâmico via MySQL."""
    try:
        from sqlalchemy import text
        db_treasury.expire_all()
        
        # 1. Buscar Caixas (Contas)
        # Se loja_id=0 ou 1, pegamos tudo para garantir visibilidade conforme solicitado
        if loja_id <= 1:
            query_caixas = text("SELECT id, nome, tipo, saldo_atual FROM caixas")
            caixas_rows = db_treasury.execute(query_caixas).fetchall()
        else:
            query_caixas = text("SELECT id, nome, tipo, saldo_atual FROM caixas WHERE loja_id = :lid")
            caixas_rows = db_treasury.execute(query_caixas, {"lid": loja_id}).fetchall()
        
        caixas = []
        saldo_geral = 0.0
        saldo_ben = 0.0
        saldo_jm = 0.0
        
        for r in caixas_rows:
            # Usando mapeamento seguro por nome ou índice fixo do SELECT acima
            c_id, c_nome, c_tipo, c_saldo = r[0], r[1], r[2], (r[3] or 0.0)
            
            caixas.append({
                "id": c_id,
                "nome": c_nome,
                "tipo": c_tipo,
                "saldo_atual": float(c_saldo)
            })
            
            saldo_geral += float(c_saldo)
            if c_tipo == 'benevolencia':
                saldo_ben += float(c_saldo)
            elif c_tipo == 'joias_mensalidade':
                saldo_jm += float(c_saldo)
        
        # 2. Calcular Pendências (Tudo que está com status 'pendente')
        query_pend = text("""
            SELECT tipo, SUM(valor) as total 
            FROM transacoes 
            WHERE status = 'pendente' 
            GROUP BY tipo
        """)
        pend_rows = db_treasury.execute(query_pend).fetchall()
        
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
        return {
            "caixas": [],
            "total_entrada_pendente": 0.0,
            "total_saida_pendente": 0.0,
            "saldo_geral": 0.0,
            "saldo_benevolencia": 0.0,
            "saldo_joias_mensalidade": 0.0,
            "error": str(e)
        }

@router.post("/caixas", response_model=CaixaResponse)
def criar_caixa(dados: CaixaCreate, db_treasury: Session = Depends(get_treasury_db)):
        print(f"DEBUG: Criando caixa {dados.nome} para loja {dados.loja_id}")
        try:
            nuevo_caixa = Caixa(
                loja_id=dados.loja_id,
                nome=dados.nome,
                tipo=dados.tipo,
                descricao=dados.descricao,
                saldo_atual=dados.saldo_inicial
            )
            db_treasury.add(nuevo_caixa)
            db_treasury.commit()
            db_treasury.refresh(nuevo_caixa)
            return nuevo_caixa
        except Exception as e:
            db_treasury.rollback()
            print(f"DEBUG ERROR: {e}")
            raise HTTPException(status_code=500, detail=str(e))

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
    db_treasury: Session = Depends(get_treasury_db)
):
    """Listar situação financeira dos irmãos contribuintes da Loja.
    Joia: Valor fixo de R$ 2000 total.
    Mensalidade: R$ 250/mês a partir da admissão (se admitido até dia 15).
    Saúde Financeira: Atrasado se pendência > 1 mês ou se no mês atual passou do dia 10 sem pagar.
    """
    try:
        from sqlalchemy import text
        from datetime import datetime, date

        # Data atual para cálculos
        hoje = date.today()

        query_pessoas = text("""
            SELECT p.id, p.nome, c.nome AS cargo_nome, p.data_admissao
            FROM pessoas p
            LEFT JOIN cargos c ON p.cargo_id = c.id
            WHERE p.loja_id = :lid
              AND (c.isento_contribuicao = 0 OR p.cargo_id IS NULL)
            ORDER BY c.id, p.nome
        """)
        pessoas = db_treasury.execute(query_pessoas, {"lid": loja_id}).fetchall()

        res = []
        for p in pessoas:
            pid, nome, cargo_nome, data_adm_str = p[0], p[1], (p[2] or ""), p[3]

            # 1. JOIA (Total de R$ 2.000)
            j_paga = db_treasury.execute(text(
                "SELECT COALESCE(SUM(valor),0) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'joia' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]
            j_pend = max(0.0, 2000.0 - float(j_paga))

            # 2. MENSALIDADE (Cálculo proativo por tempo de filiação)
            # Valor mensal: R$ 250
            m_paga = db_treasury.execute(text(
                "SELECT COALESCE(SUM(valor),0) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'mensalidade' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]

            # Calcular meses devidos
            m_pend = 0.0
            if data_adm_str:
                try:
                    data_adm = datetime.strptime(data_adm_str, "%Y-%m-%d").date()
                    
                    # Regra do usuário: Se admitido após o dia 15, começa a pagar no mês seguinte
                    inicio_cobranca = data_adm
                    if data_adm.day > 15:
                        if data_adm.month == 12:
                            inicio_cobranca = date(data_adm.year + 1, 1, 1)
                        else:
                            inicio_cobranca = date(data_adm.year, data_adm.month + 1, 1)
                    
                    # Total de meses desde o início da cobrança até hoje
                    # (Mesmo ano/mês = 1 mês)
                    meses_totais = (hoje.year - inicio_cobranca.year) * 12 + (hoje.month - inicio_cobranca.month) + 1
                    if meses_totais < 0: meses_totais = 0
                    
                    valor_esperado = meses_totais * 250.0
                    m_pend = max(0.0, valor_esperado - float(m_paga))
                except:
                    m_pend = 0.0 # Caso data esteja mal formatada (ex: string vazia)

            # 3. SAÚDE FINANCEIRA
            # ATRASADO: > 1 mensalidade pendente OU 1 mensalidade pendente e passou do dia 10
            is_atrasado = False
            if m_pend > 250:
                is_atrasado = True
            elif m_pend >= 250 and hoje.day > 10:
                is_atrasado = True
                
            if is_atrasado:
                saude = "ATRASADO"
            elif (j_pend > 0 or m_pend > 0):
                saude = "PENDENTE"
            else:
                saude = "REGULAR"

            res.append({
                "id": pid,
                "nome": nome,
                "cargo": cargo_nome,
                "joia_paga": float(j_paga),
                "joia_pendente": float(j_pend),
                "mensalidade_paga": float(m_paga),
                "mensalidade_pendente": float(m_pend),
                "saude_financeira": saude
            })

        return res
    except Exception as e:
        print(f"ERRO AO LISTAR FINANCEIRO IRMAOS: {e}")
        import traceback
        print(traceback.format_exc())
        return []

