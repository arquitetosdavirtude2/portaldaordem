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
    mes: Optional[int] = None, 
    ano: Optional[int] = None, 
    status: Optional[str] = None,
    db_treasury: Session = Depends(get_treasury_db)
):
    try:
        db_treasury.expire_all()
        from sqlalchemy import text
        
        query = "SELECT id, caixa_id, pessoa_id, usuario_id, tipo, categoria, valor, data_vencimento, data_pagamento, descricao, status FROM transacoes WHERE 1=1"
        params = {}

        if caixa_id > 0:
            query += " AND caixa_id = :caixa_id"
            params["caixa_id"] = caixa_id
        
        if status and status != 'todos':
            query += " AND status = :status"
            params["status"] = status
            
        if mes:
            # Assumindo data_vencimento no formato YYYY-MM-DD
            # Usando LIKE para compatibilidade SQLite/MySQL
            mes_str = f"-{mes:02d}-"
            query += " AND data_vencimento LIKE :mes"
            params["mes"] = f"%{mes_str}%"
            
        if ano:
            ano_str = f"{ano}-"
            query += " AND data_vencimento LIKE :ano"
            params["ano"] = f"{ano_str}%"

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
            SELECT p.id, p.nome, c.nome AS cargo_nome, p.data_admissao, p.ativo, p.data_adormecimento
            FROM pessoas p
            LEFT JOIN cargos c ON p.cargo_id = c.id
            WHERE p.loja_id = :lid
              AND (:incl_adorm = 1 OR (COALESCE(p.data_adormecimento, '') = '' AND COALESCE(p.ativo, 1) = 1))
            ORDER BY c.id, p.nome
        """)
        pessoas = db_treasury.execute(query_pessoas, {"lid": loja_id, "incl_adorm": 1 if incluir_adormecidos else 0}).fetchall()

        res = []
        for p in pessoas:
            pid, nome, cargo_nome, data_adm_str = p[0], p[1], (p[2] or ""), p[3]
            ativo = p[4] if len(p) > 4 else 1
            data_adormecimento = p[5] if len(p) > 5 else None
            tipo_ingresso = p[6] if len(p) > 6 else 'iniciacao'

            # Calcular meses devidos a partir da data de admissão
            meses_devidos = 0
            # 1. JOIA (Total de R$ 2.000)
            j_paga = db_treasury.execute(text(
                "SELECT COALESCE(SUM(valor),0) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'joia' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]
            if tipo_ingresso == 'transferencia':
                j_pend = 0.0
            else:
                j_pend = max(0.0, 2000.0 - float(j_paga))

            # 2. MENSALIDADE
            # Contamos quantas mensalidades foram pagas (qualquer valor, inclusive R$0 por desconto)
            m_pagas_count = db_treasury.execute(text(
                "SELECT COUNT(id) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'mensalidade' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]
            m_paga = db_treasury.execute(text(
                "SELECT COALESCE(SUM(valor),0) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'mensalidade' AND status = 'pago'"
            ), {"pid": pid}).fetchone()[0]

            # Buscar exceções cadastradas para esse obreiro
            excecoes_rows = db_treasury.execute(text(
                "SELECT id, mes_ref, justificativa FROM mensalidade_excecoes WHERE pessoa_id = :pid"
            ), {"pid": pid}).fetchall()
            excecoes_map = {r[1]: {"id": r[0], "justificativa": r[2]} for r in excecoes_rows}

            m_pend = 0.0
            detalhes_meses = [] # Para o botão de detalhamento solicitado

            if data_adm_str:
                try:
                    import calendar
                    MESES_PT = {
                        1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
                        5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
                        9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
                    }

                    data_adm = datetime.strptime(str(data_adm_str).strip(), "%Y-%m-%d").date()
                    
                    # Regra do dia 15:
                    # - Admitido até o dia 15: paga a mensalidade do próprio mês de admissão
                    # - Admitido após o dia 15: começa a pagar no mês seguinte
                    if data_adm.day > 15:
                        if data_adm.month == 12:
                            inicio_cobranca = date(data_adm.year + 1, 1, 1)
                        else:
                            inicio_cobranca = date(data_adm.year, data_adm.month + 1, 1)
                    else:
                        inicio_cobranca = date(data_adm.year, data_adm.month, 1)
                    
                    curr = date(inicio_cobranca.year, inicio_cobranca.month, 1)
                    alvo_limite = date(alvo.year, alvo.month, 1)
                    
                    # Para adormecidos, limitar até a data de adormecimento
                    if data_adormecimento and not ativo:
                        try:
                            data_adorm = datetime.strptime(str(data_adormecimento).strip(), "%Y-%m-%d").date()
                            alvo_limite = min(alvo_limite, date(data_adorm.year, data_adorm.month, 1))
                        except:
                            pass

                    while curr <= alvo_limite:
                        mes_ref_str = curr.strftime("%Y-%m")
                        
                        # Conta meses devidos
                        if curr < date(hoje.year, hoje.month, 1):
                            meses_devidos += 1
                        elif curr == date(hoje.year, hoje.month, 1) and hoje.day > 10:
                            meses_devidos += 1

                        # Verifica exceção (ignorar este mês)
                        if mes_ref_str in excecoes_map:
                            if curr.month == 12:
                                curr = date(curr.year + 1, 1, 1)
                            else:
                                curr = date(curr.year, curr.month + 1, 1)
                            continue

                        # Verifica se existe algum lançamento de mensalidade pago neste mês
                        # (COUNT > 0: qualquer valor conta, inclusive R$0 por desconto/empréstimo)
                        count_pago = db_treasury.execute(text("""
                            SELECT COUNT(id)
                            FROM transacoes 
                            WHERE pessoa_id = :pid 
                              AND categoria = 'mensalidade' 
                              AND status = 'pago'
                              AND data_vencimento LIKE :ref
                        """), {"pid": pid, "ref": f"{mes_ref_str}%"}).fetchone()[0]
                        
                        if count_pago == 0:
                            # Não foi pago e não tem exceção
                            if curr < date(hoje.year, hoje.month, 1):
                                m_pend += 250.0
                                detalhes_meses.append({
                                    "mes_ref": mes_ref_str,
                                    "label": f"{MESES_PT[curr.month]}/{curr.year}",
                                    "ignorado": False,
                                    "excecao_id": None,
                                    "justificativa": None
                                })
                            elif curr == date(hoje.year, hoje.month, 1) and hoje.day > 10:
                                m_pend += 250.0
                                detalhes_meses.append({
                                    "mes_ref": mes_ref_str,
                                    "label": f"{MESES_PT[curr.month]}/{curr.year}",
                                    "ignorado": False,
                                    "excecao_id": None,
                                    "justificativa": None
                                })
                        
                        # Avança mês
                        if curr.month == 12:
                            curr = date(curr.year + 1, 1, 1)
                        else:
                            curr = date(curr.year, curr.month + 1, 1)
                except Exception as ex:
                    print(f"ERRO no cálculo de mensalidade para pessoa {pid}: {ex}")
                    m_pend = 0.0
                    meses_devidos = 0

            # 3. SAÚDE FINANCEIRA
            is_atrasado = (m_pend > 0)
            
            if is_atrasado:
                saude = "ATRASADO"
            elif (j_pend > 0):
                saude = "PENDENTE"
            else:
                saude = "REGULAR"

            res.append({
                "id": pid,
                "nome": nome,
                "cargo": cargo_nome,
                "data_admissao": str(data_adm_str) if data_adm_str else None,
                "data_adormecimento": str(data_adormecimento) if data_adormecimento else None,
                "ativo": int(ativo) if ativo is not None else 1,
                "meses_devidos": meses_devidos,
                "meses_pagos": int(m_pagas_count),
                "joia_paga": float(j_paga),
                "joia_pendente": float(j_pend),
                "mensalidade_paga": float(m_paga),
                "mensalidade_pendente": float(m_pend),
                "saude_financeira": saude,
                "meses_atraso": detalhes_meses
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
