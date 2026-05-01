from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Pessoa, Estado, Cargo
from datetime import datetime

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────────────────

class CargoResponse(BaseModel):
    id: int
    nome: str
    isento_contribuicao: int

    class Config:
        from_attributes = True

class PessoaCreate(BaseModel):
    nome: str
    telefone: str
    estado_sigla: str
    status: Optional[str] = "Aprendiz"
    cargo_id: Optional[int] = None
    loja_id: Optional[int] = None
    login: Optional[str] = None
    senha: Optional[str] = None
    data_admissao: Optional[str] = None
    ativo: Optional[int] = 1
    data_adormecimento: Optional[str] = None
    tipo_ingresso: Optional[str] = "iniciacao"
    indicador_id: Optional[int] = None
    tipo_pessoa: Optional[str] = "obreiro"
    motivo_adormecimento: Optional[str] = None
    data_iniciacao: Optional[str] = None

class PessoaUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    status: Optional[str] = None
    cargo_id: Optional[int] = None
    loja_id: Optional[int] = None
    login: Optional[str] = None
    senha: Optional[str] = None
    data_admissao: Optional[str] = None
    ativo: Optional[int] = None
    data_adormecimento: Optional[str] = None
    tipo_ingresso: Optional[str] = None
    indicador_id: Optional[int] = None
    tipo_pessoa: Optional[str] = None
    motivo_adormecimento: Optional[str] = None
    data_iniciacao: Optional[str] = None

class PessoaResponse(BaseModel):
    id: int
    nome: str
    telefone: str
    status: str
    cargo_id: Optional[int] = None
    cargo_nome: Optional[str] = None
    loja_id: Optional[int] = None
    loja_nome: Optional[str] = None
    login: Optional[str] = None
    senha: Optional[str] = None
    data_admissao: Optional[str] = None
    ativo: Optional[int] = 1
    data_adormecimento: Optional[str] = None
    tipo_ingresso: Optional[str] = "iniciacao"
    indicador_id: Optional[int] = None
    tipo_pessoa: Optional[str] = "obreiro"
    motivo_adormecimento: Optional[str] = None
    data_iniciacao: Optional[str] = None

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_response(p: Pessoa) -> PessoaResponse:
    return PessoaResponse(
        id=p.id,
        nome=p.nome,
        telefone=p.telefone or "",
        status=(p.status or "Aprendiz").strip(),
        cargo_id=p.cargo_id,
        cargo_nome=p.cargo_rel.nome if p.cargo_rel else None,
        loja_id=p.loja_id,
        loja_nome=p.loja.nome if p.loja else None,
        login=p.login,
        senha=p.senha,
        data_admissao=p.data_admissao,
        ativo=p.ativo,
        data_adormecimento=p.data_adormecimento,
        tipo_ingresso=p.tipo_ingresso or "iniciacao",
        indicador_id=p.indicador_id,
        tipo_pessoa=p.tipo_pessoa or "obreiro",
        motivo_adormecimento=p.motivo_adormecimento,
        data_iniciacao=p.data_iniciacao
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/cargos", response_model=List[CargoResponse])
def listar_cargos(db: Session = Depends(get_db)):
    """Retorna todos os cargos maçônicos cadastrados."""
    return db.query(Cargo).order_by(Cargo.id).all()


# IMPORTANTE: /loja/{loja_id} DEVE vir ANTES de /{estado_sigla}
@router.get("/loja/{loja_id}")
def listar_pessoas_loja(loja_id: int, db: Session = Depends(get_db)):
    """Lista pessoas de uma loja específica utilizando ORM para maior segurança."""
    pessoas = db.query(Pessoa).filter(Pessoa.loja_id == loja_id).order_by(Pessoa.nome).all()
    return [_build_response(p) for p in pessoas]


@router.get("/{estado_sigla}", response_model=List[PessoaResponse])
def listar_pessoas(estado_sigla: str, db: Session = Depends(get_db)):
    estado = db.query(Estado).filter(Estado.sigla == estado_sigla).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Estado não encontrado")
    pessoas = db.query(Pessoa).filter(Pessoa.estado_id == estado.id).all()
    return [_build_response(p) for p in pessoas]


@router.post("/", response_model=PessoaResponse)
def criar_pessoa(pessoa: PessoaCreate, db: Session = Depends(get_db)):
    estado = db.query(Estado).filter(Estado.sigla == pessoa.estado_sigla).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Estado não encontrado")

    nova = Pessoa(
        nome=pessoa.nome,
        telefone=pessoa.telefone,
        status=pessoa.status,
        cargo_id=pessoa.cargo_id,
        estado_id=estado.id,
        loja_id=pessoa.loja_id,
        login=pessoa.login,
        senha=pessoa.senha,
        data_admissao=pessoa.data_admissao or datetime.now().strftime("%Y-%m-%d"),
        ativo=pessoa.ativo if pessoa.ativo is not None else 1,
        data_adormecimento=pessoa.data_adormecimento,
        tipo_ingresso=pessoa.tipo_ingresso or "iniciacao",
        indicador_id=pessoa.indicador_id,
        tipo_pessoa=pessoa.tipo_pessoa or "obreiro",
        motivo_adormecimento=pessoa.motivo_adormecimento,
        data_iniciacao=pessoa.data_iniciacao
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return _build_response(nova)


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
    if dados.cargo_id is not None:
        pessoa.cargo_id = dados.cargo_id if dados.cargo_id != 0 else None
    if dados.loja_id is not None:
        pessoa.loja_id = dados.loja_id if dados.loja_id != 0 else None
    if dados.login is not None:
        pessoa.login = dados.login
    if dados.senha is not None:
        pessoa.senha = dados.senha
    if dados.data_admissao is not None:
        pessoa.data_admissao = dados.data_admissao
    if dados.ativo is not None:
        pessoa.ativo = dados.ativo
    if dados.data_adormecimento is not None:
        pessoa.data_adormecimento = dados.data_adormecimento
    if dados.tipo_ingresso is not None:
        pessoa.tipo_ingresso = dados.tipo_ingresso
    if dados.indicador_id is not None:
        pessoa.indicador_id = dados.indicador_id if dados.indicador_id != 0 else None
    if dados.tipo_pessoa is not None:
        pessoa.tipo_pessoa = dados.tipo_pessoa
    if dados.motivo_adormecimento is not None:
        pessoa.motivo_adormecimento = dados.motivo_adormecimento
    if dados.data_iniciacao is not None:
        pessoa.data_iniciacao = dados.data_iniciacao

    db.commit()
    db.refresh(pessoa)
    return _build_response(pessoa)


@router.delete("/{pessoa_id}")
def deletar_pessoa(pessoa_id: int, db: Session = Depends(get_db)):
    pessoa = db.query(Pessoa).filter(Pessoa.id == pessoa_id).first()
    if not pessoa:
        raise HTTPException(status_code=404, detail="Pessoa não encontrada")
    db.delete(pessoa)
    db.commit()
    return {"message": "Pessoa removida com sucesso"}
