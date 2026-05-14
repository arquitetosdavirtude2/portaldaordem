from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import ConteudoEstudo, MaterialEstudo, ProgressoEstudo, Quiz, EntregaTrabalho, Pessoa
from typing import List, Optional
import os
import shutil
import json
from datetime import datetime

router = APIRouter(prefix="/api/trabalhos", tags=["trabalhos"])

UPLOAD_DIR = "uploads/trabalhos"
VIDEO_DIR = "uploads/videos"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

@router.get("/")
def listar_conteudos(loja_id: int, pessoa_id: Optional[int] = None, grau: Optional[int] = None, db: Session = Depends(get_db)):
    """Lista todos os conteúdos disponíveis para a loja, filtrando por grau se aplicável."""
    query = db.query(ConteudoEstudo).filter(ConteudoEstudo.loja_id == loja_id)
    if grau:
        query = query.filter(ConteudoEstudo.grau == grau)
    
    conteudos = query.order_by(ConteudoEstudo.ordem).all()
    
    resultados = []
    for c in conteudos:
        c_dict = {
            "id": c.id,
            "titulo": c.titulo,
            "tipo": c.tipo,
            "grau": c.grau,
            "ordem": c.ordem,
            "materiais": [{"id": m.id, "tipo": m.tipo, "url": m.url, "nome": m.nome_arquivo} for m in c.materiais_rel],
            "quizzes": [{"id": q.id, "pergunta": q.pergunta} for q in c.quizzes_rel]
        }
        
        if pessoa_id:
            prog = db.query(ProgressoEstudo).filter(ProgressoEstudo.pessoa_id == pessoa_id, ProgressoEstudo.conteudo_id == c.id).first()
            entrega = db.query(EntregaTrabalho).filter(EntregaTrabalho.pessoa_id == pessoa_id, EntregaTrabalho.conteudo_id == c.id).first()
            
            c_dict["progresso"] = {
                "status": prog.status if prog else "pendente",
                "quiz_score": prog.quiz_score if prog else None,
                "data_conclusao": prog.data_conclusao if prog else None,
                "data_agendamento": prog.data_agendamento if prog else None
            }
            c_dict["entrega"] = {
                "status": entrega.status if entrega else "pendente",
                "url": entrega.arquivo_url if entrega else None,
                "feedback": entrega.feedback if entrega else None
            }
        
        resultados.append(c_dict)
        
    return resultados

@router.post("/conteudo")
def criar_conteudo(
    loja_id: int = Form(...),
    titulo: str = Form(...),
    tipo: str = Form(...),
    grau: int = Form(1),
    db: Session = Depends(get_db)
):
    """Diretoria cria um novo Trabalho ou Preleção."""
    novo = ConteudoEstudo(loja_id=loja_id, titulo=titulo, tipo=tipo, grau=grau)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@router.post("/material/upload")
async def upload_material(
    conteudo_id: int = Form(...),
    tipo: str = Form(...), # 'video' ou 'pdf'
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Faz upload de material (video ou apoio) para um conteúdo."""
    diretorio = VIDEO_DIR if tipo == 'video' else UPLOAD_DIR
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(diretorio, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    material = MaterialEstudo(
        conteudo_id=conteudo_id,
        tipo=tipo,
        nome_arquivo=file.filename,
        url=f"/{diretorio}/{filename}",
        data_upload=datetime.now().isoformat()
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material

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
    entrega.status = "pendente"
    
    db.commit()
    return {"message": "Trabalho enviado com sucesso"}
