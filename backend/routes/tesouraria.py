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
from models import Transacao, Pessoa, Caixa
from datetime import datetime, date
import calendar

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
        # Garantir que a pasta existe
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(comprovante.file, buffer)
        anexo_url = f"/api/static/uploads/comprovantes/{filename}"

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

    if dados.caixa_id is not None:
        transacao.caixa_id = dados.caixa_id
    if dados.pessoa_id is not None:
        transacao.pessoa_id = dados.pessoa_id if dados.pessoa_id != 0 else None
    if dados.descricao is not None:
        transacao.descricao = dados.descricao
    if dados.notas is not None:
        transacao.notas = dados.notas
    if dados.data_vencimento is not None:
        transacao.data_vencimento = dados.data_vencimento
    if dados.categoria is not None:
        transacao.categoria = dados.categoria
    if dados.anexo_url is not None:
        transacao.anexo_url = dados.anexo_url

    if dados.data_pagamento is not None:
        transacao.data_pagamento = dados.data_pagamento
        
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
    loja_id: int,
    mes: Optional[int] = None, 
    ano: Optional[int] = None, 
    status: Optional[str] = None,
    busca: Optional[str] = None,
    db_treasury: Session = Depends(get_treasury_db)
):
    try:
        db_treasury.expire_all()
        from sqlalchemy import text
        
        # Base query with JOIN to caixas to filter by loja_id
        query = """
            SELECT t.id, t.caixa_id, t.pessoa_id, t.usuario_id, t.tipo, t.categoria, t.valor, 
                   t.data_vencimento, t.data_pagamento, t.descricao, t.status, t.anexo_url
            FROM transacoes t
            JOIN caixas c ON t.caixa_id = c.id
            WHERE c.loja_id = :loja_id
        """
        params = {"loja_id": loja_id}

        if caixa_id > 0:
            query += " AND t.caixa_id = :caixa_id"
            params["caixa_id"] = caixa_id
        
        if status and status != 'todos':
            query += " AND status = :status"
            params["status"] = status
            
        if mes:
            mes_str = f"-{mes:02d}-"
            query += " AND (CASE WHEN status = 'pago' AND (data_pagamento IS NOT NULL AND data_pagamento != '') THEN data_pagamento ELSE data_vencimento END) LIKE :mes"
            params["mes"] = f"%{mes_str}%"
            
        if ano:
            ano_str = f"{ano}-"
            query += " AND (CASE WHEN status = 'pago' AND (data_pagamento IS NOT NULL AND data_pagamento != '') THEN data_pagamento ELSE data_vencimento END) LIKE :ano"
            params["ano"] = f"{ano_str}%"

        if busca:
            query += """ AND (
                t.descricao LIKE :busca 
                OR t.categoria LIKE :busca 
                OR t.pessoa_id IN (SELECT id FROM pessoas WHERE nome LIKE :busca)
            )"""
            params["busca"] = f"%{busca}%"

        rows = db_treasury.execute(text(query), params).fetchall()
        
        res = []
        for r in rows:
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
                "anexo_url": r[11],
                "pessoa_nome": p_nome,
                "caixa_nome": "Geral"
            })
                
        return res
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

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
        return {
            "caixas": [],
            "total_entrada_pendente": 0.0,
            "total_saida_pendente": 0.0,
            "saldo_geral": 0.0,
            "saldo_benevolencia": 0.0,
            "saldo_joias_mensalidade": 0.0,
            "error": str(e)
        }


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
    db_treasury: Session = Depends(get_treasury_db)
):
    """Listar situação financeira dos irmãos contribuintes da Loja."""
    return _calcular_financeiro_irmaos_logic(loja_id, mes, ano, incluir_adormecidos, db_treasury)

def _calcular_financeiro_irmaos_logic(loja_id, mes, ano, incluir_adormecidos, db_treasury):
    try:
        from sqlalchemy import text
        from datetime import datetime, date

        # Data alvo para cálculos (se não informado, usa hoje)
        hoje = date.today()
        # Se for passado mes/ano, usamos o último dia desse mês para cálculo de pendência
        if mes and ano:
            import calendar
            _, last_day = calendar.monthrange(ano, mes)
            alvo = date(ano, mes, last_day)
        else:
            alvo = hoje

        query_pessoas = text("""
            SELECT p.id, p.nome, c.nome AS cargo_nome, p.data_admissao, p.ativo, p.data_adormecimento, p.tipo_ingresso, p.data_iniciacao,
                   p.joia_quitada_externa, p.isencao_inicio
            FROM pessoas p
            LEFT JOIN cargos c ON p.cargo_id = c.id
            WHERE p.loja_id = :lid
              AND (c.isento_contribuicao = 0 OR c.isento_contribuicao IS NULL)
              AND (:incl_adorm = 1 OR (COALESCE(p.data_adormecimento, '') = '' AND COALESCE(p.ativo, 1) = 1))
            ORDER BY c.id, p.nome
        """)
        pessoas = db_treasury.execute(query_pessoas, {"lid": loja_id, "incl_adorm": 1 if incluir_adormecidos else 0}).fetchall()

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

            # Prioriza data_iniciacao se for iniciação, senão usa data_admissao
            data_ref_calc = data_iniciacao if (tipo_ingresso == 'iniciacao' and data_iniciacao) else data_adm_original
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
                # Fluxo normal
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
                    
                    # Regra de início de cobrança (Mesmo mês se < 15, mês seguinte se > 15)
                    if data_adm.day > 15:
                        if data_adm.month == 12:
                            inicio_cobranca = date(data_adm.year + 1, 1, 1)
                        else:
                            inicio_cobranca = date(data_adm.year, data_adm.month + 1, 1)
                    else:
                        inicio_cobranca = date(data_adm.year, data_adm.month, 1)
                    
                    # O histórico no modal deve SEMPRE começar no mês de iniciação (ou primeiro mês de cobrança)
                    # para que não suma se a justificativa for removida.
                    curr = date(inicio_cobranca.year, inicio_cobranca.month, 1)
                    
                    # Se houver qualquer justificativa anterior ao início da cobrança, começamos por ela
                    for mes_exc in excecoes_map.keys():
                        if mes_exc == 'JOIA': continue
                        try:
                            exc_date = datetime.strptime(mes_exc, "%Y-%m").date()
                            if exc_date < curr:
                                curr = exc_date
                        except:
                            pass

                    alvo_limite = date(alvo.year, alvo.month, 1)
                    
                    # Contagem total de meses que deveriam ser pagos
                    total_meses_devidos_ate_hoje = 0
                    temp_curr = curr
                    while temp_curr <= alvo_limite:
                        total_meses_devidos_ate_hoje += 1
                        if temp_curr.month == 12:
                            temp_curr = date(temp_curr.year + 1, 1, 1)
                        else:
                            temp_curr = date(temp_curr.year, temp_curr.month + 1, 1)

                    if data_adormecimento and not ativo:
                        try:
                            data_adorm = datetime.strptime(str(data_adormecimento).strip(), "%Y-%m-%d").date()
                            alvo_limite = min(alvo_limite, date(data_adorm.year, data_adorm.month, 1))
                        except:
                            pass

                    inicio_cobranca_str = inicio_cobranca.strftime("%Y-%m")
                    while curr <= alvo_limite:
                        mes_ref_str = curr.strftime("%Y-%m")
                        is_mes_isento_inicio = (mes_ref_str == inicio_cobranca_str and isencao_inicio)
                        
                        # Verifica se existe algum lançamento de mensalidade pago neste mês
                        count_pago = db_treasury.execute(text("""
                            SELECT COUNT(id)
                            FROM transacoes 
                            WHERE pessoa_id = :pid 
                              AND categoria = 'mensalidade' 
                              AND status = 'pago'
                              AND data_vencimento LIKE :ref
                        """), {"pid": pid, "ref": f"{mes_ref_str}%"}).fetchone()[0]

                        # 1. Verifica se é exceção manual (Histórico)
                        if mes_ref_str in excecoes_map:
                            exc = excecoes_map[mes_ref_str]
                            detalhes_meses.append({
                                "mes_ref": mes_ref_str,
                                "label": f"{MESES_PT[curr.month]}/{curr.year}",
                                "ignorado": True,
                                "excecao_id": exc["id"],
                                "justificativa": exc["justificativa"],
                                "status": "justificado"
                            })
                            m_paga_total += 250.0
                            m_pagas_count += 1
                        
                        # 2. Verifica se está pago (Dinheiro Real)
                        elif count_pago > 0:
                            detalhes_meses.append({
                                "mes_ref": mes_ref_str,
                                "label": f"{MESES_PT[curr.month]}/{curr.year}",
                                "ignorado": False,
                                "excecao_id": None,
                                "justificativa": "Pago (Lançamento no sistema)",
                                "status": "pago"
                            })
                            # O valor pago já foi somado no m_paga_real_dinheiro lá em cima

                        # 3. Verifica se é isento pelo novo flag global
                        elif is_mes_isento_inicio:
                            detalhes_meses.append({
                                "mes_ref": mes_ref_str,
                                "label": f"{MESES_PT[curr.month]}/{curr.year}",
                                "ignorado": True,
                                "excecao_id": None,
                                "justificativa": "Isento (Mês de Iniciação)",
                                "status": "isento"
                            })
                            # NÃO soma no valor pago, apenas limpa a dívida

                        # 4. Caso contrário, está PENDENTE
                        else:
                            if curr < date(hoje.year, hoje.month, 1) or (curr == date(hoje.year, hoje.month, 1) and hoje.day > 10):
                                meses_devidos += 1
                                m_pend += 250.0
                                detalhes_meses.append({
                                    "mes_ref": mes_ref_str,
                                    "label": f"{MESES_PT[curr.month]}/{curr.year}",
                                    "ignorado": False,
                                    "excecao_id": None,
                                    "justificativa": None,
                                    "status": "pendente"
                                })
                        
                        if curr.month == 12:
                            curr = date(curr.year + 1, 1, 1)
                        else:
                            curr = date(curr.year, curr.month + 1, 1)
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
                    if d.get("ignorado"): continue # Pula os verdes
                    if d["mes_ref"] == "JOIA": continue # Pula a Joia, pois não é data
                    d_mes = datetime.strptime(d["mes_ref"], "%Y-%m").date()
                    if d_mes < date(hoje.year, hoje.month, 1):
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
                "joia_quitada_externa": joia_quitada_externa,
                "isencao_inicio": isencao_inicio
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
        from sqlalchemy import text
        db_treasury.execute(text("DELETE FROM mensalidade_excecoes WHERE id = :id"), {"id": excecao_id})
        db_treasury.commit()
        return {"message": "removido"}
    except Exception as e:
        db_treasury.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/relatorio/inadimplentes/{loja_id}")
def relatorio_inadimplentes(
    loja_id: int,
    db_treasury: Session = Depends(get_treasury_db)
):
    """Gera um relatório CSV consolidado de irmãos inadimplentes."""
    # Obter dados financeiros (sempre incluindo adormecidos para o relatório ser completo)
    dados = _calcular_financeiro_irmaos_logic(loja_id, None, None, True, db_treasury)
    
    # Filtrar apenas inadimplentes (Atrasados ou Pendentes)
    inadimplentes = [d for d in dados if d['saude_financeira'] in ['ATRASADO', 'PENDENTE']]
    
    output = io.StringIO()
    # Usar BOM para o Excel abrir corretamente com acentos
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';')
    
    # Cabeçalho
    writer.writerow(['Obreiro', 'Cargo', 'Status', 'Iniciação', 'Joia Devida', 'Mensalidade Devida', 'Meses em Aberto', 'Saúde Financeira'])
    
    for d in inadimplentes:
        meses_aberto = ", ".join([m['label'] for m in d['meses_atraso']])
        status_txt = "Ativo" if d['ativo'] == 1 else f"Adormecido ({d['data_adormecimento']})"
        
        writer.writerow([
            d['nome'],
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

@router.get("/relatorio/individual/{transacao_id}")
def relatorio_individual(transacao_id: int, db_treasury: Session = Depends(get_treasury_db)):
    """Gera um recibo/relatório individual formatado para impressão."""
    from sqlalchemy import text
    query = """
        SELECT t.id, t.descricao, t.valor, t.tipo, t.categoria, t.data_vencimento, t.data_pagamento, 
               t.notas, p.nome as pessoa_nome, c.nome as caixa_nome, l.nome as loja_nome, l.numero as loja_numero
        FROM transacoes t
        LEFT JOIN pessoas p ON t.pessoa_id = p.id
        JOIN caixas c ON t.caixa_id = c.id
        JOIN lojas l ON c.loja_id = l.id
        WHERE t.id = :tid
    """
    row = db_treasury.execute(text(query), {"tid": transacao_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    
    # Mapping
    t_id, desc, valor, tipo, cat, ref, pagto, notas, p_nome, c_nome, l_nome, l_num = row
    
    data_ref = datetime.strptime(ref, "%Y-%m-%d").strftime("%m/%Y") if ref else "-"
    # Se não houver data de pagamento explícita, usa a data de referência como fallback para exibição no recibo
    data_pag = datetime.strptime(pagto, "%Y-%m-%d").strftime("%d/%m/%Y") if pagto else (datetime.strptime(ref, "%Y-%m-%d").strftime("%d/%m/%Y") if ref else "-")
    
    # Formatação de valor PT-BR
    formatted_valor = f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    html = f"""
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <title>Recibo de Lançamento #{t_id}</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 40px; line-height: 1.6; background: #f9f9f9; }}
            .container {{ max-width: 800px; margin: auto; background: #fff; padding: 40px; border-radius: 10px; shadow: 0 0 20px rgba(0,0,0,0.1); border: 1px solid #eee; }}
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
            @media print {{
                .no-print {{ display: none; }}
                body {{ margin: 0; background: #fff; }}
                .container {{ border: none; box-shadow: none; max-width: 100%; width: 100%; }}
            }}
        </style>
    </head>
    <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right; max-width: 800px; margin: 0 auto 20px auto;">
            <button onclick="window.print()" style="padding: 12px 25px; background: #ca8a04; color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(202,138,4,0.3);">🖨️ Imprimir Comprovante</button>
        </div>

        <div class="container">
            <div class="watermark">PORTAL DA ORDEM</div>
            <div class="header">
                <h1>{l_nome} {f"Nº {l_num}" if l_num else ""}</h1>
                <p>COMPROVANTE DE MOVIMENTAÇÃO FINANCEIRA</p>
            </div>

            <div class="content">
                <div class="row">
                    <span class="label">Controle Interno</span>
                    <span class="value">#{t_id}</span>
                </div>
                <div class="row">
                    <span class="label">Descrição do Lançamento</span>
                    <span class="value">{desc}</span>
                </div>
                <div class="row">
                    <span class="label">Categoria</span>
                    <span class="value">{cat.upper()}</span>
                </div>
                <div class="row">
                    <span class="label">Tipo de Operação</span>
                    <span class="value" style="color: {'#16a34a' if tipo == 'entrada' else '#dc2626'}">{tipo.upper()}</span>
                </div>
                <div class="row">
                    <span class="label">Obreiro Relacionado</span>
                    <span class="value">{p_nome or "---"}</span>
                </div>
                <div class="row">
                    <span class="label">Mês de Referência</span>
                    <span class="value">{data_ref}</span>
                </div>
                <div class="row">
                    <span class="label">Data de Efetivação (Pagamento)</span>
                    <span class="value">{data_pag}</span>
                </div>
                <div class="row">
                    <span class="label">Conta / Caixa</span>
                    <span class="value">{c_nome}</span>
                </div>
                
                <div class="valor-box">
                    <span class="valor-label">VALOR TOTAL</span>
                    <span class="valor-value">R$ {formatted_valor}</span>
                </div>
                
                {f'<div style="margin-top: 25px; background: #fcfcfc; padding: 15px; border-left: 4px solid #eee;"><span class="label">Observações:</span><p style="margin: 5px 0 0 0; font-size: 13px; color: #444; font-style: italic;">{notas}</p></div>' if notas else ''}
                
                <div class="signature-area">
                    <div class="signature-box">TESOURARIA</div>
                    <div class="signature-box">BENEFICIÁRIO / PAGADOR</div>
                </div>
            </div>

            <div class="footer">
                Este documento é um comprovante interno gerado em {datetime.now().strftime("%d/%m/%Y às %H:%M")} através do sistema Portal da Ordem.<br>
                A validade deste comprovante está sujeita à conferência nos registros oficiais da Loja.
            </div>
        </div>
    </body>
    </html>
    """
    
    return Response(content=html, media_type='text/html')
