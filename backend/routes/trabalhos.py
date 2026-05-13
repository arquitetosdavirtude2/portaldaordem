from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import Trabalho, MaterialEstudo, ProgressoEstudo, Quiz, Pessoa
from typing import List, Optional
import os
import shutil
from datetime import datetime

router = APIRouter(prefix="/api/trabalhos", tags=["trabalhos"])

UPLOAD_DIR = "uploads/trabalhos"
VIDEO_DIR = "uploads/videos"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

@router.get("/")
def listar_trabalhos(pessoa_id: Optional[int] = None, loja_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Trabalho)
    if loja_id:
        query = query.filter(Trabalho.loja_id == loja_id)
    if pessoa_id:
        query = query.filter(Trabalho.pessoa_id == pessoa_id)
    return query.all()

@router.post("/upload")
async def upload_trabalho(
    pessoa_id: int = Form(...),
    loja_id: int = Form(...),
    titulo: str = Form(...),
    tipo: str = Form(...),
    grau: int = Form(1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    novo_trabalho = Trabalho(
        pessoa_id=pessoa_id,
        loja_id=loja_id,
        titulo=titulo,
        tipo=tipo,
        grau=grau,
        arquivo_url=f"/{UPLOAD_DIR}/{filename}",
        data_upload=datetime.now().isoformat(),
        status="pendente"
    )
    
    db.add(novo_trabalho)
    db.commit()
    db.refresh(novo_trabalho)
    return novo_trabalho

@router.get("/materiais")
def listar_materiais(loja_id: int, trabalho_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(MaterialEstudo).filter(MaterialEstudo.loja_id == loja_id)
    if trabalho_id:
        query = query.filter(MaterialEstudo.trabalho_id == trabalho_id)
    return query.order_by(MaterialEstudo.ordem).all()

@router.post("/materiais/completar")
def completar_estudo(pessoa_id: int, material_id: int, quiz_score: Optional[int] = None, db: Session = Depends(get_db)):
    progresso = db.query(ProgressoEstudo).filter(
        ProgressoEstudo.pessoa_id == pessoa_id,
        ProgressoEstudo.material_id == material_id
    ).first()
    
    if not progresso:
        progresso = ProgressoEstudo(pessoa_id=pessoa_id, material_id=material_id)
        db.add(progresso)
    
    progresso.status = "concluido"
    progresso.data_conclusao = datetime.now().isoformat()
    progresso.quiz_score = quiz_score
    
    db.commit()
    return {"status": "success"}

@router.get("/progresso/{pessoa_id}")
def ver_progresso(pessoa_id: int, db: Session = Depends(get_db)):
    return db.query(ProgressoEstudo).filter(ProgressoEstudo.pessoa_id == pessoa_id).all()
