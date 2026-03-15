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

class Loja(Base):
    __tablename__ = "lojas"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100))
    numero = Column(String(20))
    estado_id = Column(Integer, ForeignKey("estados.id"))
    endereco = Column(String(255))

    estado = relationship("Estado", back_populates="lojas")
    usuarios = relationship("Usuario", back_populates="loja")
    pessoas = relationship("Pessoa", back_populates="loja")

class Estado(Base):
    __tablename__ = "estados"
    
    id = Column(Integer, primary_key=True, index=True)
    sigla = Column(String(2), unique=True, index=True)
    nome = Column(String(50))
    # Senha removed from Estado, now in Usuario
    
    pessoas = relationship("Pessoa", back_populates="estado")
    usuarios = relationship("Usuario", secondary=usuario_estados, back_populates="estados")
    lojas = relationship("Loja", back_populates="estado")

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100))
    login = Column(String(100), unique=True, index=True)
    senha = Column(String(100))
    role = Column(String(20), default="mestre") # 'admin' (Grão-Mestrado Federal), 'mestre' (Grão-Mestrado Estadual) or 'loja' (Venerável Mestre / Loja)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=True)
    
    # Many-to-Many relationship
    estados = relationship("Estado", secondary=usuario_estados, back_populates="usuarios")
    loja = relationship("Loja", back_populates="usuarios")

class Pessoa(Base):
    __tablename__ = "pessoas"
    
    id = Column(Integer, primary_key=True, index=True)
    estado_id = Column(Integer, ForeignKey("estados.id"))
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=True)
    nome = Column(String(100))
    telefone = Column(String(20))
    status = Column(String(30), default="Profano")  # "Profano" ou "Candidato em Andamento"
    
    estado = relationship("Estado", back_populates="pessoas")
    loja = relationship("Loja", back_populates="pessoas")

class Admin(Base):
    __tablename__ = "admin"
    
    id = Column(Integer, primary_key=True, index=True)
    senha_master = Column(String(100))
