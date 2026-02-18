from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Pessoa, Estado

router = APIRouter()

# Schemas
class PessoaCreate(BaseModel):
    nome: str
    telefone: str
    estado_sigla: str
    status: Optional[str] = "Profano"

class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    status: Optional[str] = None

class PessoaResponse(BaseModel):
    id: int
    nome: str
    telefone: str
    status: str
    
    class Config:
        from_attributes = True

# Listar pessoas de um estado
@router.get("/{estado_sigla}", response_model=List[PessoaResponse])
def listar_pessoas(estado_sigla: str, db: Session = Depends(get_db)):
    estado = db.query(Estado).filter(Estado.sigla == estado_sigla).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Estado não encontrado")
    
    pessoas = db.query(Pessoa).filter(Pessoa.estado_id == estado.id).all()
    return pessoas

# Criar pessoa (só master)
@router.post("/", response_model=PessoaResponse)
def criar_pessoa(pessoa: PessoaCreate, db: Session = Depends(get_db)):
    estado = db.query(Estado).filter(Estado.sigla == pessoa.estado_sigla).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Estado não encontrado")
    
    nova_pessoa = Pessoa(
        nome=pessoa.nome,
        telefone=pessoa.telefone,
        status=pessoa.status,
        estado_id=estado.id
    )
    
    db.add(nova_pessoa)
    db.commit()
    db.refresh(nova_pessoa)
    return nova_pessoa

# Atualizar status da pessoa
@router.patch("/{pessoa_id}", response_model=PessoaResponse)
def atualizar_pessoa(pessoa_id: int, dados: PessoaUpdate, db: Session = Depends(get_db)):
    pessoa = db.query(Pessoa).filter(Pessoa.id == pessoa_id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    
    if dados.nome is not None:
        pessoa.nome = dados.nome
    if dados.telefone is not None:
        pessoa.telefone = dados.telefone
    if dados.status is not None:
        pessoa.status = dados.status
    
    db.commit()
    db.refresh(pessoa)
    return pessoa

# Deletar pessoa (só master)
@router.delete("/{pessoa_id}")
def deletar_pessoa(pessoa_id: int, db: Session = Depends(get_db)):
    pessoa = db.query(Pessoa).filter(Pessoa.id == pessoa_id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    
    db.delete(pessoa)
    db.commit()
    return {"message": "Pessoa removida com sucesso"}
