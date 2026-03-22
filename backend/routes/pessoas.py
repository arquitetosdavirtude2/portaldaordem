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
    status: Optional[str] = "Aprendiz"
    cargo: Optional[str] = None
    loja_id: Optional[int] = None
    login: Optional[str] = None
    senha: Optional[str] = None

class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    status: Optional[str] = None
    cargo: Optional[str] = None
    loja_id: Optional[int] = None
    login: Optional[str] = None
    senha: Optional[str] = None

class PessoaResponse(BaseModel):
    id: int
    nome: str
    telefone: str
    status: str
    cargo: Optional[str] = None
    loja_id: Optional[int] = None
    loja_nome: Optional[str] = None
    login: Optional[str] = None
    senha: Optional[str] = None
   
    class Config:
        from_attributes = True

# Listar pessoas de um estado
@router.get("/{estado_sigla}", response_model=List[PessoaResponse])
def listar_pessoas(estado_sigla: str, db: Session = Depends(get_db)):
    estado = db.query(Estado).filter(Estado.sigla == estado_sigla).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Estado não encontrado")
    
    pessoas = db.query(Pessoa).filter(Pessoa.estado_id == estado.id).all()
    
    response = []
    for p in pessoas:
        loja_nome = p.loja.nome if p.loja else None
        response.append(PessoaResponse(
            id=p.id,
            nome=p.nome,
            telefone=p.telefone,
            status=p.status,
            cargo=p.cargo,
            loja_id=p.loja_id,
            loja_nome=loja_nome,
            login=p.login,
            senha=p.senha
        ))
    return response

# Listar pessoas de uma loja específica
@router.get("/loja/{loja_id}", response_model=List[PessoaResponse])
def listar_pessoas_loja(loja_id: int, db: Session = Depends(get_db)):
    pessoas = db.query(Pessoa).filter(Pessoa.loja_id == loja_id).all()
    
    response = []
    for p in pessoas:
        loja_nome = p.loja.nome if p.loja else None
        response.append(PessoaResponse(
            id=p.id,
            nome=p.nome,
            telefone=p.telefone,
            status=p.status,
            cargo=p.cargo,
            loja_id=p.loja_id,
            loja_nome=loja_nome,
            login=p.login,
            senha=p.senha
        ))
    return response

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
        cargo=pessoa.cargo,
        estado_id=estado.id,
        loja_id=pessoa.loja_id,
        login=pessoa.login,
        senha=pessoa.senha
    )
   
    db.add(nova_pessoa)
    db.commit()
    db.refresh(nova_pessoa)
    
    loja_nome = nova_pessoa.loja.nome if nova_pessoa.loja else None
    
    return PessoaResponse(
        id=nova_pessoa.id,
        nome=nova_pessoa.nome,
        telefone=nova_pessoa.telefone,
        status=nova_pessoa.status,
        cargo=nova_pessoa.cargo,
        loja_id=nova_pessoa.loja_id,
        loja_nome=loja_nome,
        login=nova_pessoa.login,
        senha=nova_pessoa.senha
    )

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
    if dados.cargo is not None:
        if dados.cargo == "Nenhum": # Allow removing cargo
            pessoa.cargo = None
        else:
            pessoa.cargo = dados.cargo
    if dados.loja_id is not None:
        pessoa.loja_id = dados.loja_id
    if dados.login is not None:
        pessoa.login = dados.login
    if dados.senha is not None:
        pessoa.senha = dados.senha
   
    db.commit()
    db.refresh(pessoa)
    
    loja_nome = pessoa.loja.nome if pessoa.loja else None
    
    return PessoaResponse(
        id=pessoa.id,
        nome=pessoa.nome,
        telefone=pessoa.telefone,
        status=pessoa.status,
        cargo=pessoa.cargo,
        loja_id=pessoa.loja_id,
        loja_nome=loja_nome,
        login=pessoa.login,
        senha=pessoa.senha
    )

# Deletar pessoa (só master)
@router.delete("/{pessoa_id}")
def deletar_pessoa(pessoa_id: int, db: Session = Depends(get_db)):
    pessoa = db.query(Pessoa).filter(Pessoa.id == pessoa_id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    
    db.delete(pessoa)
    db.commit()
    return {"message": "Pessoa removida com sucesso"}
