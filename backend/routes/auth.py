from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Estado, Admin, Usuario

router = APIRouter()

class LoginRequest(BaseModel):
    login: str  # Changed from 'estado'/sigla to generic 'login'
    senha: str

class LoginResponse(BaseModel):
    success: bool
    tipo: str = None # 'master' (Admin Table), 'admin' (Usuario Grão), 'mestre' (Usuario)
    role: str = None # same as above, normalizing
    allowed_states: list = [] # List of siglas
    message: str = None
    loja_id: int = None

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Authenticate standard User (Usuario table)
    user = db.query(Usuario).filter(Usuario.login == request.login).first()
    
    if not user:
        return LoginResponse(success=False, message="Usuário não encontrado")
    
    if user.senha == request.senha:
        # User is authenticated
        states = []
        if user.role == 'admin': # Grão-Mestrado
            states = ['*'] # All access
        elif user.role == 'loja':
            if user.loja and user.loja.estado:
                states = [user.loja.estado.sigla]
        else:
            states = [e.sigla for e in user.estados]
            
        return LoginResponse(
            success=True, 
            tipo="leitor", # Frontend uses this to distinguish from Master-Admin table login
            role=user.role, 
            allowed_states=states,
            loja_id=user.loja_id if user.role == 'loja' else None
        )
    
    return LoginResponse(success=False, message="Senha incorreta")

@router.post("/admin-login", response_model=LoginResponse)
def admin_login(request: LoginRequest, db: Session = Depends(get_db)):
    # Authenticate Master Admin (Admin table)
    # Hardcoded 'admin' check for the username part if desired, but mostly checking password against Admin table
    
    if request.login != "admin":
         return LoginResponse(success=False, message="Login administrativo inválido")

    admin_obj = db.query(Admin).first()
    if admin_obj and request.senha == admin_obj.senha_master:
         return LoginResponse(success=True, tipo="master")
    
    return LoginResponse(success=False, message="Credenciais administrativas inválidas")
