from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
from database import get_db
from models import Estado, Admin, Usuario, Pessoa

router = APIRouter()

class LoginRequest(BaseModel):
    login: str  # Changed from 'estado'/sigla to generic 'login'
    senha: str

from typing import Optional

class LoginResponse(BaseModel):
    success: bool
    tipo: Optional[str] = None # 'master' (Admin Table), 'admin' (Usuario Grão), 'mestre' (Usuario)
    role: Optional[str] = None # same as above, normalizing
    allowed_states: list = [] # List of siglas
    message: Optional[str] = None
    loja_id: Optional[int] = None
    loja_nome: Optional[str] = None
    loja_numero: Optional[str] = None
    loja_cidade: Optional[str] = None # Used to display the exact city in the dashboard header
    nome: Optional[str] = None
    cargo: Optional[str] = None

@router.post("/login/", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Authenticate standard User (Usuario table) first
    user = db.query(Usuario).filter(Usuario.login == request.login).first()
    
    if user:
        if user.senha == request.senha:
            # User is authenticated
            states = []
            cidade = None
            if user.role == 'admin': # Grão-Mestrado Federal
                states = ['*'] # All access
            elif user.role == 'loja':
                if user.loja:
                    if user.loja.estado:
                        states = [user.loja.estado.sigla]
                    cidade = user.loja.endereco # In this system, endereco holds the city name
            else:
                states = [e.sigla for e in user.estados]
                
            # Translate internal role to display title
            cargo_display = "Irmão"
            if user.role == "admin":
                cargo_display = "Grão-Mestre"
            elif user.role == "mestre":
                cargo_display = "Grão-Mestre Estadual"
            elif user.role == "loja":
                cargo_display = "Venerável Mestre"

            return LoginResponse(
                success=True, 
                tipo="leitor", 
                role=user.role, 
                allowed_states=states,
                loja_id=user.loja_id if user.role == 'loja' else None,
                loja_nome=user.loja.nome if user.role == 'loja' and user.loja else None,
                loja_numero=user.loja.numero if user.role == 'loja' and user.loja else None,
                loja_cidade=cidade,
                nome=getattr(user, 'nome', 'Irmão'), 
                cargo=cargo_display
            )
        return LoginResponse(success=False, message="Senha incorreta")
    
    # If not a standard user, check if it's the Master Admin
    import os
    if request.login == "admin":
        admin_obj = db.query(Admin).first()
        env_senha = os.getenv("SENHA_MASTER", "admin123")
        
        is_valid = False
        if admin_obj and request.senha == admin_obj.senha_master:
            is_valid = True
        elif not admin_obj and request.senha == env_senha:
            # Fallback for empty/wiped database
            is_valid = True
            
        if is_valid:
             return LoginResponse(
                 success=True, 
                 tipo="master", 
                 role="admin", # Give it admin role for unified frontend checks
                 allowed_states=['*'], # implicit all access
                 nome="Grão Mestre",
                 cargo="Grão Mestre"
             )
        return LoginResponse(success=False, message="Senha incorreta")

    # If not found in Usuario, check Pessoas table (regular members)
    pessoa = db.query(Pessoa).filter(Pessoa.login == request.login).first()
    if pessoa:
        if pessoa.senha == request.senha:
            states = []
            if pessoa.loja and pessoa.loja.estado:
                states = [pessoa.loja.estado.sigla]
            
            cidade = pessoa.loja.endereco if pessoa.loja else None
            
            return LoginResponse(
                success=True,
                tipo="membro",
                role="membro",
                allowed_states=states,
                loja_id=pessoa.loja_id,
                loja_nome=pessoa.loja.nome if pessoa.loja else None,
                loja_numero=pessoa.loja.numero if pessoa.loja else None,
                loja_cidade=cidade,
                nome=pessoa.nome,
                cargo=pessoa.cargo or "Irmão"
            )
        return LoginResponse(success=False, message="Senha incorreta")

    # Not found in any table
    return LoginResponse(success=False, message="Usuário não encontrado")

@router.post("/admin-login", response_model=LoginResponse)
def admin_login(request: LoginRequest, db: Session = Depends(get_db)):
    # Authenticate Master Admin (Admin table) - maintained for backward compat
    import os
    if request.login != "admin":
         return LoginResponse(success=False, message="Login administrativo inválido")

    admin_obj = db.query(Admin).first()
    env_senha = os.getenv("SENHA_MASTER", "admin123")
    
    is_valid = False
    if admin_obj and request.senha == admin_obj.senha_master:
         is_valid = True
    elif not admin_obj and request.senha == env_senha:
         is_valid = True
         
    if is_valid:
         return LoginResponse(
             success=True, 
             tipo="master",
             role="admin",
             allowed_states=['*']
         )
    
    return LoginResponse(success=False, message="Credenciais administrativas inválidas")
