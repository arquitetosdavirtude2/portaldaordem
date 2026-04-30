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

    class Config:
        from_attributes = True


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_response(p: Pessoa) -> PessoaResponse:
    return PessoaResponse(
        id=p.id,
        nome=p.nome,
        telefone=p.telefone or "",
        status=p.status or "",
        cargo_id=p.cargo_id,
        cargo_nome=p.cargo_rel.nome if p.cargo_rel else None,
        loja_id=p.loja_id,
        loja_nome=p.loja.nome if p.loja else None,
        login=p.login,
        senha=p.senha,
        data_admissao=p.data_admissao,
        ativo=p.ativo,
        data_adormecimento=p.data_adormecimento,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/cargos", response_model=List[CargoResponse])
def listar_cargos(db: Session = Depends(get_db)):
    """Retorna todos os cargos maçônicos cadastrados."""
    return db.query(Cargo).order_by(Cargo.id).all()


# IMPORTANTE: /loja/{loja_id} DEVE vir ANTES de /{estado_sigla}
@router.get("/loja/{loja_id}")
def listar_pessoas_loja(loja_id: int, db: Session = Depends(get_db)):
    """Lista pessoas de uma loja específica via Raw SQL para máxima confiabilidade."""
    rows = db.execute(text("""
        SELECT p.id, p.nome, p.status, p.cargo_id, c.nome as cargo_nome,
               p.loja_id, p.telefone, p.login, p.senha, p.ativo, p.data_adormecimento, p.data_admissao
        FROM pessoas p
        LEFT JOIN cargos c ON p.cargo_id = c.id
        WHERE p.loja_id = :lid
        ORDER BY c.id, p.nome
    """), {"lid": loja_id}).fetchall()

    return [{
        "id": r[0], "nome": r[1], "status": r[2] or "",
        "cargo_id": r[3], "cargo_nome": r[4] or "",
        "loja_id": r[5], "telefone": r[6] or "",
        "login": r[7], "senha": r[8],
        "ativo": r[9], "data_adormecimento": r[10], "data_admissao": r[11]
    } for r in rows]


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
    )
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
        pessoa.loja_id = dados.loja_id
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
