from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import Loja, Estado, Usuario, Pessoa

router = APIRouter()

class LojaBase(BaseModel):
    nome: str
    numero: str
    estado_id: Optional[int] = None
    endereco: Optional[str] = None
    rito: Optional[str] = None

class LojaCreate(LojaBase):
    pass

class LojaResponse(LojaBase):
    id: int
    estado_sigla: str
    total_membros: int = 0

    class Config:
        from_attributes = True

@router.post("/", response_model=LojaResponse)
def create_loja(loja: LojaCreate, db: Session = Depends(get_db)):
    estado = db.query(Estado).filter(Estado.id == loja.estado_id).first()
    if not estado:
        raise HTTPException(status_code=400, detail="Estado não encontrado")

    new_loja = Loja(
        nome=loja.nome,
        numero=loja.numero,
        estado_id=loja.estado_id,
        endereco=loja.endereco,
        rito=loja.rito
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
        rito=new_loja.rito,
        estado_sigla=estado.sigla
    )

@router.get("/", response_model=List[LojaResponse])
def list_lojas(db: Session = Depends(get_db)):
    lojas = db.query(Loja).options(joinedload(Loja.estado)).all()
    response = []
    for l in lojas:
        estado_sigla = l.estado.sigla if l.estado else ""
        try:
            total_real = db.query(Pessoa).filter(Pessoa.loja_id == l.id).count()
            # Conta VMs que existem apenas na tabela de usuários
            logins_pessoas = [p.login for p in db.query(Pessoa.login).filter(Pessoa.loja_id == l.id).all() if p.login]
            vms_virtuais = db.query(Usuario).filter(
                Usuario.loja_id == l.id, 
                Usuario.role == 'loja',
                ~Usuario.login.in_(logins_pessoas) if logins_pessoas else True
            ).count()
            total_membros = total_real + vms_virtuais
        except:
            total_membros = 0

        response.append(LojaResponse(
            id=l.id,
            nome=l.nome,
            numero=l.numero,
            estado_id=l.estado_id,
            endereco=l.endereco,
            rito=l.rito,
            estado_sigla=estado_sigla,
            total_membros=total_membros
        ))
    return response

@router.get("/{loja_id}", response_model=LojaResponse)
def get_loja(loja_id: int, db: Session = Depends(get_db)):
    db_loja = db.query(Loja).options(joinedload(Loja.estado)).filter(Loja.id == loja_id).first()
    if not db_loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    
    estado_sigla = db_loja.estado.sigla if db_loja.estado else ""
    try:
        total_real = db.query(Pessoa).filter(Pessoa.loja_id == db_loja.id).count()
        logins_pessoas = [p.login for p in db.query(Pessoa.login).filter(Pessoa.loja_id == db_loja.id).all() if p.login]
        vms_virtuais = db.query(Usuario).filter(
            Usuario.loja_id == db_loja.id, 
            Usuario.role == 'loja',
            ~Usuario.login.in_(logins_pessoas) if logins_pessoas else True
        ).count()
        total_membros = total_real + vms_virtuais
    except:
        total_membros = 0

    return LojaResponse(
        id=db_loja.id,
        nome=db_loja.nome,
        numero=db_loja.numero,
        estado_id=db_loja.estado_id,
        endereco=db_loja.endereco,
        rito=db_loja.rito,
        estado_sigla=estado_sigla,
        total_membros=total_membros
    )

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
    db_loja.rito = loja_update.rito

    db.commit()
    db.refresh(db_loja)

    return LojaResponse(
        id=db_loja.id,
        nome=db_loja.nome,
        numero=db_loja.numero,
        estado_id=db_loja.estado_id,
        endereco=db_loja.endereco,
        rito=db_loja.rito,
        estado_sigla=estado.sigla
    )

@router.delete("/{loja_id}")
def delete_loja(loja_id: int, db: Session = Depends(get_db)):
    loja = db.query(Loja).filter(Loja.id == loja_id).first()
    if not loja:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    
    # Refresh to avoid stale ORM cache
    db.refresh(loja)
    
    # Check for linked Users (admins/masters assigned to this Loja)
    usuarios_vinculados = db.query(Usuario).filter(Usuario.loja_id == loja_id).count()
    if usuarios_vinculados > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir: existem {usuarios_vinculados} usuário(s) vinculado(s) a esta Loja. Remova-os primeiro."
        )
    
    # Check for linked Members (Pessoas/Obreiros) - use BOTH methods to be safe
    obreiros_raw = db.query(Pessoa).filter(Pessoa.loja_id == loja_id).count()
    obreiros_rel = len(loja.pessoas)
    obreiros_vinculados = max(obreiros_raw, obreiros_rel)
    
    if obreiros_vinculados > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir: existem {obreiros_vinculados} membro(s) vinculado(s) a esta Loja. Remova-os primeiro."
        )
    
    db.delete(loja)
    db.commit()
    return {"message": "Loja deletada com sucesso"}
