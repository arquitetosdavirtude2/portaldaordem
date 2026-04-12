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
    # Clean input
    login_clean = request.login.strip().lower()
    
    # Authenticate standard User (Usuario table) first
    from sqlalchemy import func
    user = db.query(Usuario).filter(func.lower(Usuario.login) == login_clean).first()
    
    if user:
        if user.senha == request.senha:
            # User is authenticated
            states = []
            cidade = None
            if user.role in ['admin', 'Federal']: # Grão-Mestrado Federal
                states = ['*'] # All access
            elif user.role == 'loja':
                if user.loja:
                    if user.loja.estado:
                        states = [user.loja.estado.sigla]
                    cidade = user.loja.endereco 
            else:
                states = [e.sigla for e in user.estados]
                
            # Translate internal role to display title
            cargo_display = "Irmão"
            # Support both internal 'mestre' and production 'Estadual'
            if user.role in ["admin", "Federal"]:
                cargo_display = "Grão-Mestre"
            elif user.role in ["mestre", "Estadual"]:
                cargo_display = "Grão-Mestre Estadual"
            elif user.role == "loja":
                cargo_display = "Venerável Mestre"
            elif user.role == "tesoureiro":
                cargo_display = "Tesoureiro"
            
            # Normalize role for frontend if it's Estadual
            normalized_role = user.role
            if user.role == "Estadual":
                normalized_role = "mestre"

            return LoginResponse(
                success=True, 
                tipo="leitor", 
                role=normalized_role, 
                allowed_states=states,
                loja_id=user.loja_id if user.role == 'loja' else None,
                loja_nome=user.loja.nome if user.role == 'loja' and user.loja else None,
                loja_numero=user.loja.numero if user.role == 'loja' and user.loja else None,
                loja_cidade=cidade,
                nome=getattr(user, 'nome', 'Irmão').strip(), 
                cargo=cargo_display
            )
        return LoginResponse(success=False, message="Senha incorreta")
    
    # If not a standard user, check if it's the Master Admin
    if login_clean == "admin":
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
                 allowed_states=['*'],
                 nome="Grão Mestre",
                 cargo="Grão Mestre"
             )
        return LoginResponse(success=False, message="Senha incorreta")

    # Check Pessoas table (regular members)
    pessoa = db.query(Pessoa).filter(func.lower(Pessoa.login) == login_clean).first()
    if pessoa:
        if pessoa.senha == request.senha:
            states = []
            if pessoa.loja and pessoa.loja.estado:
                states = [pessoa.loja.estado.sigla]
            
            cidade = pessoa.loja.endereco if pessoa.loja else None
            
            user_role = "membro"
            if pessoa.cargo and "tesoureiro" in pessoa.cargo.lower():
                user_role = "tesoureiro"
            
            return LoginResponse(
                success=True,
                tipo="membro",
                role=user_role,
                allowed_states=states,
                loja_id=pessoa.loja_id,
                loja_nome=pessoa.loja.nome if pessoa.loja else None,
                loja_numero=pessoa.loja.numero if pessoa.loja else None,
                loja_cidade=cidade,
                nome=pessoa.nome.strip(),
                cargo=pessoa.cargo or "Irmão"
            )
        return LoginResponse(success=False, message="Senha incorreta")

    return LoginResponse(success=False, message="Usuário não encontrado - VER: 2.0")

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
