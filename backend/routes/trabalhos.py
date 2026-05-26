from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import ConteudoEstudo, MaterialEstudo, ProgressoEstudo, Quiz, EntregaTrabalho, Pessoa, RespostaQuiz, ProgressoMaterial
from typing import List, Optional
import os
import shutil
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote

router = APIRouter(prefix="/api/trabalhos", tags=["trabalhos"])

UPLOAD_DIR = "uploads/trabalhos"
VIDEO_DIR = "uploads/videos"
MATERIAIS_DOC_DIR = "uploads/materiais/documentos"
MATERIAIS_VID_DIR = "uploads/materiais/videos"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(MATERIAIS_DOC_DIR, exist_ok=True)
os.makedirs(MATERIAIS_VID_DIR, exist_ok=True)

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR_RESOLVED = BASE_DIR / "uploads"

def resolver_caminho_arquivo(arquivo_url: str) -> Path:
    if not arquivo_url:
        raise HTTPException(status_code=404, detail="Entrega sem arquivo_url")

    arquivo_url = unquote(arquivo_url).replace("\\", "/").lstrip("/")

    if arquivo_url.startswith("uploads/"):
        caminho = BASE_DIR / arquivo_url
    else:
        caminho = UPLOADS_DIR_RESOLVED / arquivo_url

    caminho = caminho.resolve()

    if "uploads" not in str(caminho):
        raise HTTPException(status_code=400, detail="Caminho de arquivo inválido")

    return caminho

@router.get("/")
def listar_conteudos(loja_id: Optional[str] = None, pessoa_id: Optional[str] = None, grau: Optional[str] = None, db: Session = Depends(get_db)):
    """Lista todos os conteúdos disponíveis, filtrando por loja se fornecido."""
    try:
        # Cast seguro para evitar erro 422 quando o frontend envia "undefined" ou "null"
        try:
            loja_id_int = int(loja_id) if loja_id and loja_id not in ("undefined", "null", "") else None
        except ValueError:
            loja_id_int = None
            
        try:
            pessoa_id_int = int(pessoa_id) if pessoa_id and pessoa_id not in ("undefined", "null", "") else None
        except ValueError:
            pessoa_id_int = None
            
        try:
            grau_int = int(grau) if grau and grau not in ("undefined", "null", "") else None
        except ValueError:
            grau_int = None

        query = db.query(ConteudoEstudo)
        if loja_id_int:
            query = query.filter(ConteudoEstudo.loja_id == loja_id_int)
        
        if grau_int and grau_int > 0:
            query = query.filter(ConteudoEstudo.grau == grau_int)
        
        conteudos = query.order_by(ConteudoEstudo.ordem).all()
        
        resultados = []
        for c in conteudos:
            c_dict = {
                "id": c.id,
                "conteudo_id": c.id, # Enviando ambos para evitar erros no frontend
                "titulo": c.titulo,
                "tipo": c.tipo,
                "grau": c.grau,
                "ordem": c.ordem,
                "ativo": getattr(c, 'ativo', 1),
                "descricao_jornada": getattr(c, 'descricao_jornada', None),
                "imagem_jornada_url": getattr(c, 'imagem_jornada_url', None),
                "materiais": [],
                "quizzes": [],
                "progresso": {"status": "pendente", "quiz_score": None, "nota": None, "data_conclusao": None, "data_agendamento": None},
                "entrega": {"status": "pendente", "url": None, "feedback": None},
                "contagens": {"videos": 0, "documentos": 0, "quizzes": 0, "pendencias": 0}
            }
            
            # Buscar materiais ordenados protegendo contra erros de schema
            try:
                materiais = db.query(MaterialEstudo).filter(MaterialEstudo.conteudo_id == c.id).order_by(MaterialEstudo.ordem).all()
                c_dict["materiais"] = [{"id": m.id, "tipo": m.tipo, "url": m.url, "nome": m.nome_arquivo, "titulo": getattr(m, 'titulo', None), "descricao": getattr(m, 'descricao', None), "ordem": getattr(m, 'ordem', 0), "duracao_segundos": getattr(m, 'duracao_segundos', None)} for m in materiais]
                c_dict["contagens"]["videos"] = len([m for m in materiais if m.tipo == 'video'])
                c_dict["contagens"]["documentos"] = len([m for m in materiais if m.tipo in ('pdf', 'docx', 'documento')])
            except Exception as e:
                db.rollback()
                print(f"[GET /trabalhos] Erro ao buscar materiais (schema desatualizado?): {e}")
                materiais = []
            
            # Buscar quizzes ordenados protegendo contra erros de schema
            try:
                quizzes = db.query(Quiz).filter(Quiz.conteudo_id == c.id).order_by(Quiz.ordem).all()
                c_dict["quizzes"] = [{"id": q.id, "pergunta": q.pergunta, "opcoes_json": q.opcoes_json, "resposta_correta": q.resposta_correta, "tipo": getattr(q, 'tipo', 'livre'), "ordem": getattr(q, 'ordem', 0)} for q in quizzes]
                c_dict["contagens"]["quizzes"] = len(quizzes)
            except Exception as e:
                db.rollback()
                print(f"[GET /trabalhos] Erro ao buscar quizzes: {e}")
                quizzes = []
            
            # Contar pendências protegendo contra erros
            try:
                pendencias = db.query(RespostaQuiz).filter(RespostaQuiz.conteudo_id == c.id, RespostaQuiz.status == 'pendente').count()
                c_dict["contagens"]["pendencias"] = pendencias
            except Exception as e:
                db.rollback()
                print(f"[GET /trabalhos] Erro ao contar pendências: {e}")
            
            # Buscar progresso e entregas APENAS SE pessoa_id_int for numérico válido
            if pessoa_id_int:
                try:
                    prog = db.query(ProgressoEstudo).filter(ProgressoEstudo.pessoa_id == pessoa_id_int, ProgressoEstudo.conteudo_id == c.id).first()
                    if prog:
                        c_dict["progresso"] = {
                            "status": prog.status or "pendente",
                            "quiz_score": prog.quiz_score,
                            "nota": getattr(prog, 'nota', None),
                            "data_conclusao": prog.data_conclusao,
                            "data_agendamento": prog.data_agendamento
                        }
                except Exception as e:
                    db.rollback()
                    print(f"[GET /trabalhos] Erro ao buscar ProgressoEstudo: {e}")
                
                try:
                    entrega = db.query(EntregaTrabalho).filter(EntregaTrabalho.pessoa_id == pessoa_id_int, EntregaTrabalho.conteudo_id == c.id).first()
                    if entrega:
                        c_dict["entrega"] = {
                            "status": entrega.status or "pendente",
                            "url": entrega.arquivo_url,
                            "feedback": entrega.feedback
                        }
                except Exception as e:
                    db.rollback()
                    print(f"[GET /trabalhos] Erro ao buscar EntregaTrabalho: {e}")
            
            resultados.append(c_dict)
            
        return resultados
    except Exception as e:
        import traceback
        error_msg = f"[GET /api/trabalhos/] Falha crítica: {str(e)}"
        try:
            print(error_msg)
        except Exception:
            pass
        # Não falhar com 500 se o Frontend já está esperando um array
        return []

@router.post("/conteudo")
def criar_conteudo(
    loja_id: int = Form(...),
    titulo: str = Form(...),
    tipo: str = Form(...),
    grau: int = Form(1),
    descricao_jornada: str = Form(None),
    db: Session = Depends(get_db)
):
    """Diretoria cria um novo Trabalho ou Preleção."""
    novo = ConteudoEstudo(loja_id=loja_id, titulo=titulo, tipo=tipo, grau=grau, descricao_jornada=descricao_jornada)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@router.put("/conteudo/{conteudo_id}")
def editar_conteudo(
    conteudo_id: int,
    titulo: str = Form(None),
    tipo: str = Form(None),
    grau: int = Form(None),
    ordem: int = Form(None),
    descricao_jornada: str = Form(None),
    db: Session = Depends(get_db)
):
    """Diretoria edita os dados gerais de um Trabalho ou Preleção."""
    conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == conteudo_id).first()
    if not conteudo:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado")
    
    if titulo is not None: conteudo.titulo = titulo
    if tipo is not None: conteudo.tipo = tipo
    if grau is not None: conteudo.grau = grau
    if ordem is not None: conteudo.ordem = ordem
    if descricao_jornada is not None: conteudo.descricao_jornada = descricao_jornada
    
    db.commit()
    db.refresh(conteudo)
    return conteudo

@router.delete("/conteudo/{conteudo_id}")
def excluir_conteudo(
    conteudo_id: int,
    force: bool = False,
    db: Session = Depends(get_db)
):
    """Diretoria exclui um Trabalho ou Preleção.
    Se houver progresso de obreiros, bloqueia a exclusão (faz soft delete) a menos que force=True."""
    conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == conteudo_id).first()
    if not conteudo:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado")
    
    # Verificar se existe progresso de obreiros
    tem_progresso = db.query(ProgressoEstudo).filter(ProgressoEstudo.conteudo_id == conteudo_id).first()
    tem_entrega = db.query(EntregaTrabalho).filter(EntregaTrabalho.conteudo_id == conteudo_id).first()
    tem_respostas = db.query(RespostaQuiz).filter(RespostaQuiz.conteudo_id == conteudo_id).first()
    
    if (tem_progresso or tem_entrega or tem_respostas) and not force:
        # Soft delete: marca como inativo em vez de apagar
        conteudo.ativo = 0
        db.commit()
        return {"message": "Conteúdo inativado (possui progresso de obreiros). Use force=true para excluir permanentemente.", "soft_delete": True}
    
    # Cascade seguro: apagar dados relacionados
    db.query(RespostaQuiz).filter(RespostaQuiz.conteudo_id == conteudo_id).delete()
    db.query(ProgressoMaterial).filter(
        ProgressoMaterial.material_id.in_(
            db.query(MaterialEstudo.id).filter(MaterialEstudo.conteudo_id == conteudo_id)
        )
    ).delete(synchronize_session=False)
    db.query(MaterialEstudo).filter(MaterialEstudo.conteudo_id == conteudo_id).delete()
    db.query(Quiz).filter(Quiz.conteudo_id == conteudo_id).delete()
    db.query(ProgressoEstudo).filter(ProgressoEstudo.conteudo_id == conteudo_id).delete()
    db.query(EntregaTrabalho).filter(EntregaTrabalho.conteudo_id == conteudo_id).delete()
    db.delete(conteudo)
    db.commit()
    return {"message": "Conteúdo e dados relacionados excluídos permanentemente."}
import unicodedata
import re

def safe_print(label, value):
    try:
        print(label, str(value).encode("utf-8", errors="replace").decode("utf-8"))
    except Exception:
        print(label, "[erro ao imprimir]")

def sanitize_ascii_filename(name: str) -> str:
    name = name or "arquivo"
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("._-")
    return name or "arquivo"

@router.post("/material/upload")
async def upload_material(
    conteudo_id: int = Form(...),
    tipo: str = Form(...),
    titulo: str = Form(...),
    descricao: str = Form(None),
    ordem: int = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Faz upload de material (video ou apoio) para um conteudo."""
    try:
        safe_print("conteudo_id:", conteudo_id)
        safe_print("tipo:", tipo)
        safe_print("titulo:", titulo)
        safe_print("descricao:", descricao)
        safe_print("ordem:", ordem)
        safe_print("filename:", file.filename)

        if not file:
            raise HTTPException(status_code=400, detail="Arquivo nao enviado.")

        # Verifica se conteudo existe
        conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == conteudo_id).first()
        if not conteudo:
            raise HTTPException(status_code=404, detail="Conteudo nao encontrado.")

        # Normaliza tipo para 'documento' se vier diferente e não for video
        if tipo != 'video':
            tipo = 'documento'

        import time
        from uuid import uuid4
        
        original_filename = file.filename or "arquivo"
        ext = Path(original_filename).suffix.lower()

        allowed = [".pdf", ".doc", ".docx", ".mp4", ".mov", ".webm", ".bin"]
        if ext not in allowed:
            raise HTTPException(status_code=400, detail="Formato de arquivo nao permitido.")

        safe_base = sanitize_ascii_filename(Path(original_filename).stem)
        safe_filename = f"material_{conteudo_id}_{int(time.time())}_{uuid4().hex}{ext}"
        
        base_dir_local = Path(__file__).resolve().parent.parent
        dir_escolhido = MATERIAIS_VID_DIR if tipo == 'video' else MATERIAIS_DOC_DIR
        upload_dir_local = base_dir_local / dir_escolhido
        upload_dir_local.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir_local / safe_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Se ordem nao foi informada, colocar no final da sequencia
        if ordem is None:
            max_ordem = db.query(MaterialEstudo).filter(
                MaterialEstudo.conteudo_id == conteudo_id,
                MaterialEstudo.tipo == tipo
            ).count()
            ordem = max_ordem + 1
        
        arquivo_url = f"/{dir_escolhido}/{safe_filename}"
        
        material = MaterialEstudo(
            conteudo_id=conteudo_id,
            tipo=tipo,
            nome_arquivo=original_filename, # Original para o BD
            url=arquivo_url,
            data_upload=datetime.now().isoformat(),
            titulo=titulo or original_filename,
            descricao=descricao,
            ordem=ordem,
            ativo=1
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        
        return {
            "success": True,
            "message": "Material enviado com sucesso.",
            "arquivo_url": arquivo_url,
            "nome_arquivo": original_filename,
            "titulo": titulo,
            "descricao": descricao,
            "ordem": ordem
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("ERRO REAL NO UPLOAD DE MATERIAL:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"{type(e).__name__}: {str(e)}"
        )

@router.get("/materiais/{material_id}/arquivo")
async def baixar_material(material_id: int, download: bool = False, db: Session = Depends(get_db)):
    """Retorna o arquivo fisico do material para download ou preview inline."""
    material = db.query(MaterialEstudo).filter(MaterialEstudo.id == material_id).first()
    if not material or not material.url:
        raise HTTPException(status_code=404, detail="Material não encontrado ou sem arquivo")
        
    caminho = resolver_caminho_arquivo(material.url)
    if not caminho.exists():
        raise HTTPException(status_code=404, detail="Arquivo físico não encontrado no servidor")
        
    ext = caminho.suffix.lower()
    media_type = "application/octet-stream"
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext in [".mp4", ".mov", ".webm"]:
        media_type = f"video/{ext.strip('.')}"
    elif ext in [".docx", ".doc"]:
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        
    headers = {}
    from urllib.parse import quote
    nome_seguro = quote(material.nome_arquivo or caminho.name)

    if download:
        headers["Content-Disposition"] = f"attachment; filename*=UTF-8''{nome_seguro}"
    else:
        headers["Content-Disposition"] = f"inline; filename*=UTF-8''{nome_seguro}"
        
    return FileResponse(
        path=caminho, 
        media_type=media_type, 
        headers=headers
    )
@router.post("/quiz")
async def configurar_quiz(
    conteudo_id: int = Form(...),
    perguntas_json: str = Form(...), # JSON string of list of dicts
    db: Session = Depends(get_db)
):
    """Limpa quizzes antigos e salva os novos para um conteúdo."""
    # Delete antigos
    db.query(Quiz).filter(Quiz.conteudo_id == conteudo_id).delete()
    
    perguntas = json.loads(perguntas_json)
    for p in perguntas:
        q = Quiz(
            conteudo_id=conteudo_id,
            pergunta=p['pergunta'],
            opcoes_json=json.dumps(p['opcoes']),
            resposta_correta=p['resposta_correta']
        )
        db.add(q)
        
    db.commit()
    return {"message": "Quiz salvo com sucesso"}

@router.post("/entrega")
async def upload_entrega(
    pessoa_id: int = Form(...),
    conteudo_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Membro faz o upload de sua prancha."""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    entrega = db.query(EntregaTrabalho).filter(EntregaTrabalho.pessoa_id == pessoa_id, EntregaTrabalho.conteudo_id == conteudo_id).first()
    if not entrega:
        entrega = EntregaTrabalho(pessoa_id=pessoa_id, conteudo_id=conteudo_id)
        db.add(entrega)
        
    entrega.arquivo_url = f"/{UPLOAD_DIR}/{filename}"
    entrega.data_upload = datetime.now().isoformat()
    entrega.status = "aguardando_correcao"
    
    db.commit()
    return {"message": "Trabalho enviado com sucesso"}

@router.post("/corrigir")
def corrigir_trabalho(
    pessoa_id: int = Form(...),
    conteudo_id: int = Form(...),
    status: str = Form(...), # 'aprovado' ou 'revisar'
    feedback: str = Form(None),
    corrigido_por: int = Form(None),
    nota: float = Form(None),
    db: Session = Depends(get_db)
):
    """Luz (Admin) corrige o trabalho de um membro, aprovando ou solicitando revisão."""
    entrega = db.query(EntregaTrabalho).filter(
        EntregaTrabalho.pessoa_id == pessoa_id, 
        EntregaTrabalho.conteudo_id == conteudo_id
    ).first()
    
    if not entrega:
        entrega = EntregaTrabalho(pessoa_id=pessoa_id, conteudo_id=conteudo_id)
        db.add(entrega)
        
    entrega.status = status
    if feedback is not None:
        entrega.feedback = feedback
    if corrigido_por:
        entrega.corrigido_por = corrigido_por
    entrega.data_correcao = datetime.now().isoformat()
        
    # Atualiza o progresso de estudo correspondente
    prog = db.query(ProgressoEstudo).filter(
        ProgressoEstudo.pessoa_id == pessoa_id,
        ProgressoEstudo.conteudo_id == conteudo_id
    ).first()
    
    if not prog:
        prog = ProgressoEstudo(pessoa_id=pessoa_id, conteudo_id=conteudo_id)
        db.add(prog)
        
    if status == 'aprovado':
        prog.status = 'concluido'
        prog.data_conclusao = datetime.now().isoformat()
        if nota is not None:
            prog.nota = nota
    elif status == 'revisar':
        prog.status = 'refazer'
    elif status == 'reprovado':
        prog.data_conclusao = None
        
    db.commit()
    return {"message": "Trabalho corrigido com sucesso"}

@router.post("/entregas/admin/correcao")
def corrigir_entrega_admin(
    entrega_id: int = Form(...),
    status: str = Form(...),
    feedback: str = Form(""),
    corrigido_por: int = Form(...),
    db: Session = Depends(get_db)
):
    """Endpoint simplificado para corrigir baseado no ID da entrega diretamente."""
    entrega = db.query(EntregaTrabalho).filter(EntregaTrabalho.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
        
    entrega.status = status
    entrega.feedback = feedback
    entrega.corrigido_por = corrigido_por
    entrega.data_correcao = datetime.now().isoformat()
    
    # Atualiza progresso de estudo correspondente
    prog = db.query(ProgressoEstudo).filter(
        ProgressoEstudo.pessoa_id == entrega.pessoa_id,
        ProgressoEstudo.conteudo_id == entrega.conteudo_id
    ).first()
    
    if not prog:
        prog = ProgressoEstudo(pessoa_id=entrega.pessoa_id, conteudo_id=entrega.conteudo_id)
        db.add(prog)
        
    if status == 'aprovado':
        prog.status = 'concluido'
        prog.data_conclusao = datetime.now().isoformat()
    elif status == 'revisar' or status == 'refazer':
        prog.status = 'refazer'
        prog.data_conclusao = None
        
    db.commit()
    return {"message": "Correção aplicada com sucesso"}

@router.get("/minha-entrega/{conteudo_id}/{pessoa_id}")
def get_minha_entrega(conteudo_id: int, pessoa_id: int, db: Session = Depends(get_db)):
    entrega = db.query(EntregaTrabalho).filter(
        EntregaTrabalho.pessoa_id == pessoa_id,
        EntregaTrabalho.conteudo_id == conteudo_id
    ).order_by(EntregaTrabalho.id.desc()).first()
    
    if not entrega:
        return {"existe": False}
        
    return {
        "existe": True,
        "id": entrega.id,
        "conteudo_id": entrega.conteudo_id,
        "pessoa_id": entrega.pessoa_id,
        "arquivo_url": entrega.arquivo_url,
        "status": entrega.status,
        "feedback": entrega.feedback,
        "data_upload": entrega.data_upload
    }

@router.get("/entregas/admin")
def listar_entregas_admin(
    loja_id: int,
    db: Session = Depends(get_db)
):
    """Lista todas as entregas de trabalhos dos membros da loja para correção."""
    pessoas = db.query(Pessoa).filter(Pessoa.loja_id == loja_id).all()
    pessoa_ids = [p.id for p in pessoas]
    
    entregas = db.query(EntregaTrabalho).filter(EntregaTrabalho.pessoa_id.in_(pessoa_ids)).all()
    
    resultados = []
    for ent in entregas:
        pessoa = db.query(Pessoa).filter(Pessoa.id == ent.pessoa_id).first()
        conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == ent.conteudo_id).first()
        
        if not pessoa or not conteudo:
            continue
            
        resultados.append({
            "id": ent.id,
            "pessoa_id": ent.pessoa_id,
            "pessoa_nome": pessoa.nome,
            "conteudo_id": ent.conteudo_id,
            "conteudo_titulo": conteudo.titulo,
            "arquivo_nome": os.path.basename(ent.arquivo_url) if ent.arquivo_url else None,
            "arquivo_url": f"/api/trabalhos/entregas/{ent.id}/arquivo?download=false" if ent.arquivo_url else None,
            "arquivo_download_url": f"/api/trabalhos/entregas/{ent.id}/arquivo?download=true" if ent.arquivo_url else None,
            "status": ent.status,
            "feedback": ent.feedback,
            "data_upload": ent.data_upload
        })
        
    return resultados


# ===================================================================
# NOVOS ENDPOINTS - FASE 1
# ===================================================================

@router.post("/progresso")
def registrar_progresso(
    pessoa_id: int = Form(None),
    conteudo_id: int = Form(None),
    status: str = Form("pendente"),
    quiz_score: int = Form(None),
    nota: float = Form(None),
    db: Session = Depends(get_db)
):
    """Registra/atualiza o progresso de estudo de um obreiro.
    CORRIGE BUG: endpoint chamado pelo frontend mas que não existia."""
    if not pessoa_id or not conteudo_id:
        # Tenta ler do body JSON como fallback (o frontend envia JSON)
        from starlette.requests import Request
        raise HTTPException(status_code=400, detail="pessoa_id e conteudo_id são obrigatórios")
    
    prog = db.query(ProgressoEstudo).filter(
        ProgressoEstudo.pessoa_id == pessoa_id,
        ProgressoEstudo.conteudo_id == conteudo_id
    ).first()
    
    if not prog:
        prog = ProgressoEstudo(pessoa_id=pessoa_id, conteudo_id=conteudo_id)
        db.add(prog)
    
    prog.status = status
    if quiz_score is not None:
        prog.quiz_score = quiz_score
    if nota is not None:
        prog.nota = nota
    if status == 'concluido':
        prog.data_conclusao = datetime.now().isoformat()
    
    db.commit()
    db.refresh(prog)
    return {"message": "Progresso registrado com sucesso", "id": prog.id, "status": prog.status}


# Também aceitar JSON body (o frontend atual envia JSON, não FormData)
from pydantic import BaseModel

class ProgressoBody(BaseModel):
    pessoa_id: int
    conteudo_id: int
    status: str = "pendente"
    quiz_score: int = None
    nota: float = None

@router.post("/progresso/json")
def registrar_progresso_json(body: ProgressoBody, db: Session = Depends(get_db)):
    """Versão JSON do endpoint de progresso (compatibilidade com frontend atual)."""
    prog = db.query(ProgressoEstudo).filter(
        ProgressoEstudo.pessoa_id == body.pessoa_id,
        ProgressoEstudo.conteudo_id == body.conteudo_id
    ).first()
    
    if not prog:
        prog = ProgressoEstudo(pessoa_id=body.pessoa_id, conteudo_id=body.conteudo_id)
        db.add(prog)
    
    prog.status = body.status
    if body.quiz_score is not None:
        prog.quiz_score = body.quiz_score
    if body.nota is not None:
        prog.nota = body.nota
    if body.status == 'concluido':
        prog.data_conclusao = datetime.now().isoformat()
    
    db.commit()
    db.refresh(prog)
    return {"message": "Progresso registrado com sucesso", "id": prog.id, "status": prog.status}


# --- Gestão de Materiais ---

@router.get("/materiais/{conteudo_id}")
def listar_materiais(conteudo_id: int, db: Session = Depends(get_db)):
    """Lista materiais de um conteúdo ordenados por posição."""
    try:
        materiais = db.query(MaterialEstudo).filter(
            MaterialEstudo.conteudo_id == conteudo_id
        ).order_by(MaterialEstudo.ordem).all()
        
        resultados = []
        for m in materiais:
            # Padronizando o tipo baseado na extensão ou mantendo video
            tipo_final = m.tipo
            if m.nome_arquivo:
                nome_lower = m.nome_arquivo.lower()
                if m.tipo != 'video':
                    if nome_lower.endswith('.pdf'):
                        tipo_final = 'pdf'
                    elif nome_lower.endswith('.docx'):
                        tipo_final = 'docx'
                    elif nome_lower.endswith('.doc'):
                        tipo_final = 'doc'
            
            resultados.append({
                "id": m.id,
                "conteudo_id": m.conteudo_id,
                "tipo": tipo_final,
                "titulo": getattr(m, 'titulo', None),
                "descricao": getattr(m, 'descricao', None),
                "arquivo_nome": m.nome_arquivo,
                "arquivo_url": f"/api/trabalhos/material/{m.id}/arquivo?download=false",
                "download_url": f"/api/trabalhos/material/{m.id}/arquivo?download=true",
                "ordem": getattr(m, 'ordem', 0),
                "data_upload": m.data_upload,
                "ativo": bool(getattr(m, 'ativo', 1))
            })
            
        return resultados
    except Exception as e:
        db.rollback()
        print("[GET /materiais] erro:", str(e))
        return []


@router.put("/material/{material_id}")
def editar_material(
    material_id: int,
    titulo: str = Form(None),
    descricao: str = Form(None),
    ordem: int = Form(None),
    db: Session = Depends(get_db)
):
    """Edita título, descrição e ordem de um material existente."""
    material = db.query(MaterialEstudo).filter(MaterialEstudo.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    
    if titulo is not None:
        material.titulo = titulo
    if descricao is not None:
        material.descricao = descricao
    if ordem is not None:
        material.ordem = ordem
    
    db.commit()
    return {"message": "Material atualizado com sucesso"}


@router.get("/material/{material_id}/arquivo")
def visualizar_arquivo_material(material_id: int, download: bool = False, db: Session = Depends(get_db)):
    """Retorna o arquivo físico do material (download ou visualização inline)."""
    material = db.query(MaterialEstudo).filter(MaterialEstudo.id == material_id).first()
    if not material or not material.url:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    
    # Resolver o caminho absoluto usando a funcão já existente no trabalhos.py
    try:
        caminho_arquivo = resolver_caminho_arquivo(material.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not caminho_arquivo.exists():
        raise HTTPException(status_code=404, detail="Arquivo físico não encontrado no servidor")

    # Determinar mimetype simples para videos e pdfs
    ext = caminho_arquivo.suffix.lower()
    media_type = "application/octet-stream"
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext in [".mp4", ".mov", ".m4v"]:
        media_type = "video/mp4"
    elif ext == ".webm":
        media_type = "video/webm"
    
    headers = {}
    if download:
        headers["Content-Disposition"] = f"attachment; filename=\"{material.nome_arquivo}\""
    else:
        headers["Content-Disposition"] = f"inline; filename=\"{material.nome_arquivo}\""
        
    return FileResponse(
        path=caminho_arquivo, 
        media_type=media_type, 
        headers=headers
    )


@router.delete("/material/{material_id}")
def excluir_material(material_id: int, db: Session = Depends(get_db)):
    """Remove um material específico e seu progresso associado."""
    material = db.query(MaterialEstudo).filter(MaterialEstudo.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    
    # Remover progresso associado
    db.query(ProgressoMaterial).filter(ProgressoMaterial.material_id == material_id).delete()
    db.delete(material)
    db.commit()
    return {"message": "Material excluído com sucesso"}


# --- Respostas de Quiz ---

class RespostaQuizItem(BaseModel):
    quiz_id: int
    resposta_texto: str = None
    opcao_selecionada: int = None
    lacunas_json: str = None

class RespostasQuizBody(BaseModel):
    pessoa_id: int
    conteudo_id: int
    respostas: list[RespostaQuizItem]

@router.post("/resposta-quiz")
def submeter_respostas_quiz(body: RespostasQuizBody, db: Session = Depends(get_db)):
    """Obreiro submete respostas do quiz. Autocorrige lacunas e múltipla escolha."""
    resultados = []
    tem_livre = False
    
    for r in body.respostas:
        quiz = db.query(Quiz).filter(Quiz.id == r.quiz_id).first()
        if not quiz:
            continue
        
        # Verificar se já existe resposta (unicidade)
        existente = db.query(RespostaQuiz).filter(
            RespostaQuiz.pessoa_id == body.pessoa_id,
            RespostaQuiz.quiz_id == r.quiz_id
        ).first()
        
        if existente:
            resp = existente
        else:
            resp = RespostaQuiz(
                pessoa_id=body.pessoa_id,
                quiz_id=r.quiz_id,
                conteudo_id=body.conteudo_id
            )
            db.add(resp)
        
        resp.data_resposta = datetime.now().isoformat()
        resp.resposta_texto = r.resposta_texto
        resp.opcao_selecionada = r.opcao_selecionada
        resp.lacunas_json = r.lacunas_json
        
        # Inferir tipo do quiz
        tipo_quiz = getattr(quiz, 'tipo', None)
        if not tipo_quiz:
            try:
                data = json.loads(quiz.opcoes_json or '{}')
                tipo_quiz = data.get('tipo', 'livre')
            except Exception:
                tipo_quiz = 'livre'
        
        # Autocorreção
        if tipo_quiz == 'multipla_escolha':
            resp.is_correto = 1 if r.opcao_selecionada == quiz.resposta_correta else 0
            resp.status = 'aprovado' if resp.is_correto else 'reprovado'
            resp.nota = 10.0 if resp.is_correto else 0.0
        elif tipo_quiz == 'lacunas':
            try:
                data = json.loads(quiz.opcoes_json or '{}')
                texto = data.get('texto', '')
                lacunas_idx = data.get('lacunas', [])
                palavras = texto.split(' ')
                respostas_aluno = json.loads(r.lacunas_json or '{}')
                
                acertos = 0
                total = len(lacunas_idx)
                for idx in lacunas_idx:
                    palavra_correta = palavras[idx].strip().lower() if idx < len(palavras) else ''
                    resposta_aluno = str(respostas_aluno.get(str(idx), '')).strip().lower()
                    # Normalizar: remover acentos/pontuação extra
                    import unicodedata
                    def norm(s):
                        return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower().strip('.,;:!?')
                    if norm(resposta_aluno) == norm(palavra_correta):
                        acertos += 1
                
                resp.is_correto = 1 if acertos == total else 0
                resp.nota = round((acertos / total) * 10, 1) if total > 0 else 0
                resp.status = 'aprovado' if resp.is_correto else 'reprovado'
            except Exception:
                resp.status = 'pendente'
        else:
            # Resposta livre - aguarda correcao da Luz
            resp.status = 'pendente'
            resp.is_correto = None
            tem_livre = True
        
        resultados.append({"quiz_id": r.quiz_id, "status": resp.status, "is_correto": resp.is_correto, "nota": resp.nota})
    
    # Atualizar progresso geral do conteúdo
    prog = db.query(ProgressoEstudo).filter(
        ProgressoEstudo.pessoa_id == body.pessoa_id,
        ProgressoEstudo.conteudo_id == body.conteudo_id
    ).first()
    if not prog:
        prog = ProgressoEstudo(pessoa_id=body.pessoa_id, conteudo_id=body.conteudo_id)
        db.add(prog)
    
    if tem_livre:
        prog.status = 'aguardando_correcao'
    else:
        # Todas as respostas sao autocorrigiveis - verificar se precisa de aprovacao de trabalho
        conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == body.conteudo_id).first()
        if conteudo and conteudo.tipo == 'trabalho':
            prog.status = 'aguardando_correcao'
        else:
            # Prelecao com apenas respostas objetivas - pode concluir automaticamente
            prog.status = 'concluido'
            prog.data_conclusao = datetime.now().isoformat()
    
    db.commit()
    return {"message": "Respostas registradas", "resultados": resultados, "tem_livre": tem_livre}


@router.get("/respostas/{conteudo_id}")
def listar_respostas_conteudo(conteudo_id: int, db: Session = Depends(get_db)):
    """Luz consulta todas as respostas de um conteúdo, agrupadas por obreiro."""
    respostas = db.query(RespostaQuiz).filter(RespostaQuiz.conteudo_id == conteudo_id).all()
    
    por_pessoa = {}
    for r in respostas:
        pid = r.pessoa_id
        if pid not in por_pessoa:
            pessoa = db.query(Pessoa).filter(Pessoa.id == pid).first()
            por_pessoa[pid] = {
                "pessoa_id": pid,
                "pessoa_nome": pessoa.nome if pessoa else "Desconhecido",
                "respostas": []
            }
        por_pessoa[pid]["respostas"].append({
            "id": r.id,
            "quiz_id": r.quiz_id,
            "resposta_texto": r.resposta_texto,
            "opcao_selecionada": r.opcao_selecionada,
            "lacunas_json": r.lacunas_json,
            "is_correto": r.is_correto,
            "nota": r.nota,
            "feedback": r.feedback,
            "status": r.status,
            "data_resposta": r.data_resposta,
            "data_correcao": r.data_correcao
        })
    
    return list(por_pessoa.values())


@router.get("/respostas/{conteudo_id}/{pessoa_id}")
def listar_respostas_obreiro(conteudo_id: int, pessoa_id: int, db: Session = Depends(get_db)):
    """Luz consulta as respostas de um obreiro específico."""
    respostas = db.query(RespostaQuiz).filter(
        RespostaQuiz.conteudo_id == conteudo_id,
        RespostaQuiz.pessoa_id == pessoa_id
    ).all()
    
    resultado = []
    for r in respostas:
        quiz = db.query(Quiz).filter(Quiz.id == r.quiz_id).first()
        resultado.append({
            "id": r.id,
            "quiz_id": r.quiz_id,
            "pergunta": quiz.pergunta if quiz else "Pergunta não encontrada",
            "tipo": quiz.tipo if quiz else "desconhecido",
            "resposta_texto": r.resposta_texto,
            "opcao_selecionada": r.opcao_selecionada,
            "lacunas_json": r.lacunas_json,
            "is_correto": r.is_correto,
            "nota": r.nota,
            "feedback": r.feedback,
            "status": r.status,
            "data_resposta": r.data_resposta,
            "data_correcao": r.data_correcao
        })
    return resultado


class CorrecaoRespostaBody(BaseModel):
    resposta_id: int
    status: str  # 'aprovado', 'reprovado', 'refazer'
    feedback: str = None
    nota: float = None
    corrigido_por: int = None

@router.post("/corrigir-resposta")
def corrigir_resposta_individual(body: CorrecaoRespostaBody, db: Session = Depends(get_db)):
    """Luz corrige uma resposta individual (resposta livre)."""
    resp = db.query(RespostaQuiz).filter(RespostaQuiz.id == body.resposta_id).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Resposta não encontrada")
    
    resp.status = body.status
    resp.is_correto = 1 if body.status == 'aprovado' else 0
    if body.feedback is not None:
        resp.feedback = body.feedback
    if body.nota is not None:
        resp.nota = body.nota
    if body.corrigido_por:
        resp.corrigido_por = body.corrigido_por
    resp.data_correcao = datetime.now().isoformat()
    
    db.commit()
    return {"message": "Resposta corrigida com sucesso"}


# --- Progresso de Material ---

class ProgressoMaterialBody(BaseModel):
    pessoa_id: int
    material_id: int
    max_segundos_assistidos: int = 0
    progresso_percentual: int = 0
    concluido: int = 0

@router.post("/progresso-material")
def salvar_progresso_material(body: ProgressoMaterialBody, db: Session = Depends(get_db)):
    """Salva progresso de vídeo/documento do obreiro."""
    prog = db.query(ProgressoMaterial).filter(
        ProgressoMaterial.pessoa_id == body.pessoa_id,
        ProgressoMaterial.material_id == body.material_id
    ).first()
    
    if not prog:
        prog = ProgressoMaterial(pessoa_id=body.pessoa_id, material_id=body.material_id)
        db.add(prog)
    
    # Para vídeos: só atualizar se o novo valor for maior (evitar regresso)
    prog_max_seg = prog.max_segundos_assistidos or 0
    if body.max_segundos_assistidos > prog_max_seg:
        prog.max_segundos_assistidos = body.max_segundos_assistidos
    
    prog_percent = prog.progresso_percentual or 0
    if body.progresso_percentual > prog_percent:
        prog.progresso_percentual = body.progresso_percentual
    
    if body.concluido and not prog.concluido:
        prog.concluido = 1
        prog.data_conclusao = datetime.now().isoformat()
    
    db.commit()
    return {"message": "Progresso do material salvo", "concluido": prog.concluido}

class ProgressoVideoBody(BaseModel):
    conteudo_id: int
    material_id: int
    pessoa_id: int
    percentual: float
    segundos_assistidos: int
    duracao_segundos: int = None

@router.post("/progresso-video")
def salvar_progresso_video(body: ProgressoVideoBody, request: Request, db: Session = Depends(get_db)):
    """Salva o progresso de um video e decide automaticamente se esta concluido no backend."""
    pessoa_id = body.pessoa_id
    
    prog = db.query(ProgressoMaterial).filter(
        ProgressoMaterial.pessoa_id == pessoa_id,
        ProgressoMaterial.material_id == body.material_id
    ).first()
    
    if not prog:
        prog = ProgressoMaterial(
            pessoa_id=pessoa_id, 
            material_id=body.material_id,
            max_segundos_assistidos=0,
            progresso_percentual=0,
            concluido=0
        )
        db.add(prog)
    
    # ON DUPLICATE KEY UPDATE logic:
    atual_max_seg = prog.max_segundos_assistidos or 0
    if body.segundos_assistidos > atual_max_seg:
        prog.max_segundos_assistidos = body.segundos_assistidos
        
    if body.percentual > prog.progresso_percentual:
        prog.progresso_percentual = int(body.percentual)
        
    # Se percentual >= 95 ou chegou no final, marcar como concluido
    is_completed = body.percentual >= 95 or (body.duracao_segundos and body.segundos_assistidos >= body.duracao_segundos - 2)
    
    if is_completed and not prog.concluido:
        prog.concluido = 1
        prog.data_conclusao = datetime.now().isoformat()
        
    db.commit()
    
    return {
        "message": "Progresso do video salvo com sucesso", 
        "concluido": prog.concluido == 1
    }

@router.get("/progresso-material/{conteudo_id}/{pessoa_id}")
def consultar_progresso_materiais(conteudo_id: int, pessoa_id: int, db: Session = Depends(get_db)):
    """Consulta progresso de todos os materiais de um conteúdo para um obreiro."""
    materiais = db.query(MaterialEstudo).filter(MaterialEstudo.conteudo_id == conteudo_id).order_by(MaterialEstudo.ordem).all()
    
    resultado = []
    for m in materiais:
        prog = db.query(ProgressoMaterial).filter(
            ProgressoMaterial.pessoa_id == pessoa_id,
            ProgressoMaterial.material_id == m.id
        ).first()
        
        resultado.append({
            "material_id": m.id,
            "tipo": m.tipo,
            "titulo": getattr(m, 'titulo', None) or m.nome_arquivo,
            "ordem": getattr(m, 'ordem', 0),
            "max_segundos_assistidos": prog.max_segundos_assistidos if prog else 0,
            "progresso_percentual": prog.progresso_percentual if prog else 0,
            "concluido": prog.concluido if prog else 0
        })
    
    return resultado


@router.get("/progresso-conteudo/{conteudo_id}")
def obter_progresso_consolidado(conteudo_id: int, pessoa_id: int, db: Session = Depends(get_db)):
    """Retorna o estado consolidado do conteúdo para o usuário."""
    conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == conteudo_id).first()
    if not conteudo:
        raise HTTPException(status_code=404, detail="Conteúdo não encontrado")

    materiais = db.query(MaterialEstudo).filter(MaterialEstudo.conteudo_id == conteudo_id).order_by(MaterialEstudo.ordem).all()
    
    videos_list = []
    materiais_list = []
    
    for m in materiais:
        prog = db.query(ProgressoMaterial).filter(
            ProgressoMaterial.pessoa_id == pessoa_id,
            ProgressoMaterial.material_id == m.id
        ).first()
        
        is_concluido = prog.concluido == 1 if prog else False
        
        item = {
            "id": m.id,
            "titulo": getattr(m, 'titulo', None) or m.nome_arquivo,
            "tipo": m.tipo,
            "concluido": is_concluido,
            "data_conclusao": prog.data_conclusao if prog else None,
            "max_segundos_assistidos": prog.max_segundos_assistidos if prog else 0
        }
        
        if m.tipo == 'video':
            item['assistido'] = is_concluido
            item['percentual'] = prog.progresso_percentual if prog else 0
            item['segundos_assistidos'] = prog.max_segundos_assistidos if prog else 0
            videos_list.append(item)
        else:
            item['visualizado'] = is_concluido
            materiais_list.append(item)

    quizzes = db.query(Quiz).filter(Quiz.conteudo_id == conteudo_id).all()
    quiz_data = {"existe": len(quizzes) > 0, "respondido": False, "respostas": []}
    
    if quiz_data["existe"]:
        todas_respondidas = True
        for q in quizzes:
            resp = db.query(RespostaQuiz).filter(
                RespostaQuiz.pessoa_id == pessoa_id,
                RespostaQuiz.quiz_id == q.id
            ).first()
            if not resp:
                todas_respondidas = False
            else:
                quiz_data["respostas"].append({
                    "quiz_id": q.id,
                    "pergunta": q.pergunta,
                    "resposta_texto": resp.resposta_texto,
                    "opcao_selecionada": resp.opcao_selecionada,
                    "status": resp.status,
                    "feedback": resp.feedback
                })
        # So consideramos respondido se tiver resposta para tudo
        # Mas para simplificar, se tiver ao menos 1 ja consideramos "respondido" para travar tela de resposta livre
        quiz_data["respondido"] = len(quiz_data["respostas"]) == len(quizzes) if len(quizzes) > 0 else False

    entrega = db.query(EntregaTrabalho).filter(
        EntregaTrabalho.pessoa_id == pessoa_id,
        EntregaTrabalho.conteudo_id == conteudo_id
    ).order_by(EntregaTrabalho.id.desc()).first()

    trabalho_data = {
        "existe": conteudo.tipo == 'trabalho',
        "enviado": entrega is not None,
        "status": entrega.status if entrega else "nao_enviado",
        "arquivo_nome": os.path.basename(entrega.arquivo_url) if entrega and entrega.arquivo_url else None,
        "data_upload": entrega.data_upload if entrega else None,
        "feedback": entrega.feedback if entrega else None
    }

    # Calcula proxima etapa / modo
    videos_pendentes = any(not v['assistido'] for v in videos_list) if len(videos_list) > 0 else False
    materiais_pendentes = any(not m['visualizado'] for m in materiais_list) if len(materiais_list) > 0 else False
    
    # Tratamento de nomenclaturas: 'revisar' no banco = 'ajustes_solicitados' no front
    status_trab = trabalho_data['status']
    if status_trab == 'pendente' and trabalho_data['enviado']:
        status_trab = 'aguardando_correcao'
    elif status_trab == 'revisar':
        status_trab = 'ajustes_solicitados'
    trabalho_data['status'] = status_trab

    is_revisao = False
    if trabalho_data['existe'] and status_trab in ['aguardando_correcao', 'aprovado', 'ajustes_solicitados', 'reprovado']:
        is_revisao = True

    modo = "revisao" if is_revisao else "estudo"

    etapa_atual = 'videos'
    if status_trab == 'aprovado':
        etapa_atual = 'resultado'
    elif status_trab in ['aguardando_correcao', 'ajustes_solicitados', 'reprovado']:
        etapa_atual = 'entrega'
    elif len(videos_list) > 0 and videos_pendentes:
        etapa_atual = 'videos'
    elif len(materiais_list) > 0 and materiais_pendentes:
        etapa_atual = 'materiais'
    elif quiz_data['existe'] and not quiz_data['respondido']:
        etapa_atual = 'perguntas'
    elif trabalho_data['existe'] and status_trab == 'nao_enviado':
        etapa_atual = 'entrega'
    else:
        etapa_atual = 'resultado'

    abas = {
        "videos": {
            "liberada": True,
            "concluida": not videos_pendentes
        },
        "materiais": {
            "liberada": True if not videos_pendentes or is_revisao else False,
            "concluida": not materiais_pendentes
        },
        "perguntas": {
            "liberada": True if (not videos_pendentes and not materiais_pendentes) or is_revisao else False,
            "concluida": quiz_data['respondido']
        },
        "entrega": {
            "liberada": True if (not videos_pendentes and not materiais_pendentes and (not quiz_data['existe'] or quiz_data['respondido'])) or is_revisao else False,
            "concluida": status_trab in ['aguardando_correcao', 'aprovado', 'reprovado']
        },
        "resultado": {
            "liberada": True if status_trab in ['aguardando_correcao', 'aprovado', 'reprovado', 'ajustes_solicitados'] else False,
            "concluida": status_trab == 'aprovado'
        }
    }

    # Montar resposta conforme padrao exigido
    videos_obj = {
        "total": len(videos_list),
        "concluidos": sum(1 for v in videos_list if v['assistido']),
        "concluido": not videos_pendentes if len(videos_list) > 0 else True,
        "items": videos_list
    }

    materiais_obj = {
        "total": len(materiais_list),
        "lidos": sum(1 for m in materiais_list if m['visualizado']),
        "concluido": not materiais_pendentes if len(materiais_list) > 0 else True,
        "items": materiais_list
    }

    quiz_obj = {
        "existe": quiz_data['existe'],
        "total": len(quizzes),
        "respondidas": len(quiz_data['respostas']),
        "concluido": quiz_data['respondido'] if quiz_data['existe'] else True,
        "respostas": quiz_data['respostas']
    }

    entrega_obj = {
        "existe": trabalho_data['existe'],
        "enviada": trabalho_data['enviado'],
        "status": trabalho_data['status'] if trabalho_data['enviado'] else None,
        "arquivo_nome": trabalho_data['arquivo_nome'],
        "data_upload": trabalho_data['data_upload'],
        "feedback": trabalho_data['feedback']
    }

    return {
        "conteudo_id": conteudo_id,
        "pessoa_id": pessoa_id,
        "modo": modo,
        "etapa_atual": etapa_atual,
        "videos": videos_obj,
        "materiais": materiais_obj,
        "quiz": quiz_obj,
        "entrega": entrega_obj,
        "abas": abas
    }

# --- Painel Geral de Correções ---

@router.get("/painel-correcoes")
def painel_correcoes(loja_id: int, db: Session = Depends(get_db)):
    """Painel geral de pendências de correção para as Luzes.
    Inclui respostas livres pendentes + entregas de pranchas pendentes."""
    pessoas = db.query(Pessoa).filter(Pessoa.loja_id == loja_id).all()
    pessoa_ids = [p.id for p in pessoas]
    pessoas_map = {p.id: p.nome for p in pessoas}
    
    pendencias = []
    
    # Respostas de quiz pendentes de correção
    resps_pendentes = db.query(RespostaQuiz).filter(
        RespostaQuiz.pessoa_id.in_(pessoa_ids),
        RespostaQuiz.status == 'pendente'
    ).all()
    
    for r in resps_pendentes:
        quiz = db.query(Quiz).filter(Quiz.id == r.quiz_id).first()
        conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == r.conteudo_id).first()
        pendencias.append({
            "tipo_pendencia": "resposta_quiz",
            "id": r.id,
            "pessoa_id": r.pessoa_id,
            "pessoa_nome": pessoas_map.get(r.pessoa_id, "Desconhecido"),
            "conteudo_id": r.conteudo_id,
            "conteudo_titulo": conteudo.titulo if conteudo else "-",
            "pergunta": quiz.pergunta if quiz else "-",
            "data_envio": r.data_resposta,
            "status": r.status
        })
    
    # Entregas de pranchas pendentes
    entregas_pendentes = db.query(EntregaTrabalho).filter(
        EntregaTrabalho.pessoa_id.in_(pessoa_ids),
        EntregaTrabalho.status == 'pendente'
    ).all()
    
    for e in entregas_pendentes:
        conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == e.conteudo_id).first()
        pendencias.append({
            "tipo_pendencia": "entrega_prancha",
            "id": e.id,
            "pessoa_id": e.pessoa_id,
            "pessoa_nome": pessoas_map.get(e.pessoa_id, "Desconhecido"),
            "conteudo_id": e.conteudo_id,
            "conteudo_titulo": conteudo.titulo if conteudo else "-",
            "pergunta": None,
            "arquivo_nome": os.path.basename(e.arquivo_url) if e.arquivo_url else None,
            "arquivo_url": f"/api/trabalhos/entregas/{e.id}/arquivo?download=false" if e.arquivo_url else None,
            "arquivo_download_url": f"/api/trabalhos/entregas/{e.id}/arquivo?download=true" if e.arquivo_url else None,
            "data_upload": e.data_upload,
            "status": e.status
        })
    
    # Ordenar por data de envio (mais recente primeiro)
    pendencias.sort(key=lambda x: x.get("data_upload") if x.get("tipo_pendencia") == "entrega_prancha" else x.get("data_envio") or "", reverse=True)
    
    return {"total": len(pendencias), "pendencias": pendencias}

@router.get("/entregas/{entrega_id}/arquivo")
def obter_arquivo_entrega(entrega_id: int, download: bool = False, db: Session = Depends(get_db)):
    """Obtem o arquivo de uma entrega."""
    entrega = db.query(EntregaTrabalho).filter(EntregaTrabalho.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
        
    if not entrega.arquivo_url:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado para esta entrega")

    caminho = resolver_caminho_arquivo(entrega.arquivo_url)

    if not caminho.exists():
        raise HTTPException(
            status_code=404,
            detail={
                "erro": "Arquivo físico não encontrado",
                "arquivo_url": entrega.arquivo_url,
                "caminho_tentado": str(caminho)
            }
        )

    filename = caminho.name
    
    dono = db.query(Pessoa).filter(Pessoa.id == entrega.pessoa_id).first()
    nome_irmao = dono.nome if dono else "irmao"
    conteudo = db.query(ConteudoEstudo).filter(ConteudoEstudo.id == entrega.conteudo_id).first()
    nome_trabalho = conteudo.titulo if conteudo else "trabalho"
    
    ext = caminho.suffix.lower()
    
    # Adicionar o nome do irmão e trabalho no download (opcional mas útil)
    download_filename = f"{nome_irmao} - {nome_trabalho}{ext}"

    media_type = "application/octet-stream"
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".doc":
        media_type = "application/msword"
    elif ext in ['.jpg', '.jpeg']:
        media_type = 'image/jpeg'
    elif ext == '.png':
        media_type = 'image/png'
        media_type = 'application/octet-stream'

    return FileResponse(
        path=str(caminho),
        filename=download_filename,
        media_type=media_type,
        headers={
            "Content-Disposition": f'{"attachment" if download else "inline"}; filename="{download_filename}"'
        }
    )
