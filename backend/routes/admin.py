from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from models import Estado, Admin, Usuario

router = APIRouter()

class UserCreate(BaseModel):
    nome: str
    login: str
    senha: str
    role: str = "mestre" # admin, mestre
    estado_ids: List[int] = [] # List of IDs

class UserResponse(BaseModel):
    id: int
    nome: str
    login: str
    role: str
    estados: List[str] = [] # List of Siglas

@router.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if login already exists
    db_user = db.query(Usuario).filter(Usuario.login == user.login).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Login já existe")
    
    new_user = Usuario(
        nome=user.nome,
        login=user.login,
        senha=user.senha,
        role=user.role
    )
    
    if user.role == 'mestre' and user.estado_ids:
        states = db.query(Estado).filter(Estado.id.in_(user.estado_ids)).all()
        new_user.estados = states
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserResponse(
        id=new_user.id,
        nome=new_user.nome,
        login=new_user.login,
        role=new_user.role,
        estados=[e.sigla for e in new_user.estados]
    )

@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    users = db.query(Usuario).all()
    response = []
    for u in users:
        response.append(UserResponse(
            id=u.id,
            nome=u.nome,
            login=u.login,
            role=u.role,
            estados=[e.sigla for e in u.estados]
        ))
    return response

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_update: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Check if new login exists (and is not self)
    existing = db.query(Usuario).filter(Usuario.login == user_update.login, Usuario.id != user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Login já existe")
    
    db_user.nome = user_update.nome
    db_user.login = user_update.login
    db_user.role = user_update.role
    
    # Only update password if provided (simple logic for now, frontend sends current PW if not changed or we handle empty)
    # Actually, UserCreate requires password. Frontend must send new or keep old. 
    # For now, let's assume frontend sends a value.
    if user_update.senha:
        db_user.senha = user_update.senha
        
    if user_update.role == 'mestre' and user_update.estado_ids:
        states = db.query(Estado).filter(Estado.id.in_(user_update.estado_ids)).all()
        db_user.estados = states
    elif user_update.role == 'admin':
        db_user.estados = [] # Admin has implicit access, clear explicit links
        
    db.commit()
    db.refresh(db_user)
    
    return UserResponse(
        id=db_user.id,
        nome=db_user.nome,
        login=db_user.login,
        role=db_user.role,
        estados=[e.sigla for e in db_user.estados]
    )
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    db.delete(user)
    db.commit()
    return {"message": "Usuário deletado com sucesso"}

@router.get("/estados") # Helper to list states for the dropdown
def list_estados(db: Session = Depends(get_db)):
    return db.query(Estado).order_by(Estado.nome).all()
