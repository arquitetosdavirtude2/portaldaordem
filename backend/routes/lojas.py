from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Loja, Estado

router = APIRouter()

class LojaBase(BaseModel):
    nome: str
    numero: str
    estado_id: int
    endereco: Optional[str] = None

class LojaCreate(LojaBase):
    pass

class LojaResponse(LojaBase):
    id: int
    estado_sigla: str

    class Config:
        orm_mode = True

@router.post("/", response_model=LojaResponse)
def create_loja(loja: LojaCreate, db: Session = Depends(get_db)):
    estado = db.query(Estado).filter(Estado.id == loja.estado_id).first()
    if not estado:
        raise HTTPException(status_code=400, detail="Estado não encontrado")

    new_loja = Loja(
        nome=loja.nome,
        numero=loja.numero,
        estado_id=loja.estado_id,
        endereco=loja.endereco
    )
    
    db.add(new_loja)
    db.commit()
    db.refresh(new_loja)
    
    return LojaResponse(
        id=new_loja.id,
        nome=new_loja.nome,
        numero=new_loja.numero,
        estado_id=new_loja.estado_id,
        endereco=new_loja.endereco,
        estado_sigla=estado.sigla
    )

@router.get("/", response_model=List[LojaResponse])
def list_lojas(db: Session = Depends(get_db)):
    lojas = db.query(Loja).all()
    response = []
    for l in lojas:
        estado_sigla = l.estado.sigla if l.estado else ""
        response.append(LojaResponse(
            id=l.id,
            nome=l.nome,
            numero=l.numero,
            estado_id=l.estado_id,
            endereco=l.endereco,
            estado_sigla=estado_sigla
        ))
    return response

@router.put("/{loja_id}", response_model=LojaResponse)
def update_loja(loja_id: int, loja_update: LojaCreate, db: Session = Depends(get_db)):
    db_loja = db.query(Loja).filter(Loja.id == loja_id).first()
    if not db_loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
        
    estado = db.query(Estado).filter(Estado.id == loja_update.estado_id).first()
    if not estado:
        raise HTTPException(status_code=400, detail="Estado não encontrado")

    db_loja.nome = loja_update.nome
    db_loja.numero = loja_update.numero
    db_loja.estado_id = loja_update.estado_id
    db_loja.endereco = loja_update.endereco

    db.commit()
    db.refresh(db_loja)

    return LojaResponse(
        id=db_loja.id,
        nome=db_loja.nome,
        numero=db_loja.numero,
        estado_id=db_loja.estado_id,
        endereco=db_loja.endereco,
        estado_sigla=estado.sigla
    )

@router.delete("/{loja_id}")
def delete_loja(loja_id: int, db: Session = Depends(get_db)):
    loja = db.query(Loja).filter(Loja.id == loja_id).first()
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    
    db.delete(loja)
    db.commit()
    return {"message": "Loja deletada com sucesso"}
