from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

from sqlalchemy import Table

# Association Table
usuario_estados = Table(
    'usuario_estados', Base.metadata,
    Column('usuario_id', Integer, ForeignKey('usuarios.id')),
    Column('estado_id', Integer, ForeignKey('estados.id'))
)

class Estado(Base):
    __tablename__ = "estados"
    
    id = Column(Integer, primary_key=True, index=True)
    sigla = Column(String(2), unique=True, index=True)
    nome = Column(String(50))
    # Senha removed from Estado, now in Usuario
    
    pessoas = relationship("Pessoa", back_populates="estado")
    usuarios = relationship("Usuario", secondary=usuario_estados, back_populates="estados")

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100))
    login = Column(String(100), unique=True, index=True)
    senha = Column(String(100))
    role = Column(String(20), default="mestre") # 'admin' (Grão-Mestrado) or 'mestre'
    
    # Many-to-Many relationship
    estados = relationship("Estado", secondary=usuario_estados, back_populates="usuarios")

class Pessoa(Base):
    __tablename__ = "pessoas"
    
    id = Column(Integer, primary_key=True, index=True)
    estado_id = Column(Integer, ForeignKey("estados.id"))
    nome = Column(String(100))
    telefone = Column(String(20))
    status = Column(String(30), default="Profano")  # "Profano" ou "Candidato em Andamento"
    
    estado = relationship("Estado", back_populates="pessoas")

class Admin(Base):
    __tablename__ = "admin"
    
    id = Column(Integer, primary_key=True, index=True)
    senha_master = Column(String(100))
