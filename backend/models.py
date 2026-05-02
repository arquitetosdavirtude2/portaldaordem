from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime
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
    rito = Column(String(50), nullable=True) # Adding Rito as requested

    estado = relationship("Estado", back_populates="lojas")
    usuarios = relationship("Usuario", back_populates="loja")
    pessoas = relationship("Pessoa", back_populates="loja")
    caixas = relationship("Caixa", back_populates="loja")
    indicadores = relationship("Indicador", back_populates="loja")

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

class Cargo(Base):
    __tablename__ = "cargos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False, unique=True)
    isento_contribuicao = Column(Integer, default=0)  # 1 = isento (VM, Vigilantes)

    pessoas = relationship("Pessoa", back_populates="cargo_rel")

class Pessoa(Base):
    __tablename__ = "pessoas"
    
    id = Column(Integer, primary_key=True, index=True)
    estado_id = Column(Integer, ForeignKey("estados.id"))
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=True)
    cargo_id = Column(Integer, ForeignKey("cargos.id"), nullable=True)
    nome = Column(String(100))
    telefone = Column(String(20))
    status = Column(String(30), default="Aprendiz")  # Grau Maçônico
    login = Column(String(100), unique=True, index=True, nullable=True)
    senha = Column(String(100), nullable=True)
    data_admissao = Column(String(20), nullable=True)  # YYYY-MM-DD
    ativo = Column(Integer, default=1)  # 1=ativo, 0=adormecido
    data_adormecimento = Column(String(20), nullable=True)  # YYYY-MM-DD
    tipo_ingresso = Column(String(30), default="iniciacao") # 'iniciacao', 'transferencia'
    indicador_id = Column(Integer, ForeignKey("indicadores.id"), nullable=True)
    tipo_pessoa = Column(String(50), default="obreiro") # 'obreiro', 'candidato', 'adormecido'
    motivo_adormecimento = Column(String(500), nullable=True)
    data_iniciacao = Column(String(20), nullable=True)

    estado = relationship("Estado", back_populates="pessoas")
    loja = relationship("Loja", back_populates="pessoas")
    cargo_rel = relationship("Cargo", back_populates="pessoas")
    indicador = relationship("Indicador", back_populates="indicados")

class MensalidadeExcecao(Base):
    __tablename__ = "mensalidade_excecoes"
    id = Column(Integer, primary_key=True, index=True)
    pessoa_id = Column(Integer, ForeignKey("pessoas.id"), nullable=False)
    mes_ref = Column(String(7), nullable=False)  # formato: 'YYYY-MM'
    justificativa = Column(String(500), nullable=True)
    criado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    criado_em = Column(String(30), nullable=True)

    pessoa = relationship("Pessoa")


class Indicador(Base):
    __tablename__ = "indicadores"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    telefone = Column(String(20), nullable=True)
    pix = Column(String(100), nullable=True)
    banco_info = Column(String(500), nullable=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"), nullable=True)

    loja = relationship("Loja", back_populates="indicadores")
    indicados = relationship("Pessoa", back_populates="indicador")

class Admin(Base):
    __tablename__ = "admin"
    
    id = Column(Integer, primary_key=True, index=True)
    senha_master = Column(String(100))

class Caixa(Base):
    __tablename__ = "caixas"
    id = Column(Integer, primary_key=True, index=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"))
    nome = Column(String(100)) # Nome do Banco / Conta
    tipo = Column(String(50), default="geral") # 'geral', 'benevolencia', 'joias_mensalidade'
    descricao = Column(String(255), nullable=True) # Finalidade detalhada
    saldo_atual = Column(Float, default=0.0)

    loja = relationship("Loja", back_populates="caixas")
    transacoes = relationship("Transacao", back_populates="caixa")

class Transacao(Base):
    __tablename__ = "transacoes"
    id = Column(Integer, primary_key=True, index=True)
    caixa_id = Column(Integer, ForeignKey("caixas.id"))
    pessoa_id = Column(Integer, ForeignKey("pessoas.id"), nullable=True) # Irmão relacionado (se houver)
    usuario_id = Column(Integer, ForeignKey("usuarios.id")) # Quem lançou (Tesoureiro/Venerável)
    
    tipo = Column(String(20)) # 'entrada', 'saida'
    categoria = Column(String(50)) # 'joia', 'mensalidade', 'aluguel', etc.
    valor = Column(Float)
    data_vencimento = Column(String(20)) # 'YYYY-MM-DD' (usando string para simplificar no SQLite)
    data_pagamento = Column(String(20), nullable=True)
    descricao = Column(String(255))
    notas = Column(String(1000), nullable=True) # Observações detalhadas
    anexo_url = Column(String(255), nullable=True) # Link/Caminho do comprovante
    status = Column(String(20), default="pendente") # 'pago', 'pendente', 'atrasado'

    caixa = relationship("Caixa", back_populates="transacoes")
    pessoa = relationship("Pessoa")
    usuario = relationship("Usuario")

class ExtratoMensal(Base):
    __tablename__ = "extratos_mensais"
    id = Column(Integer, primary_key=True, index=True)
    loja_id = Column(Integer, ForeignKey("lojas.id"))
    caixa_id = Column(Integer, ForeignKey("caixas.id"))
    ano = Column(Integer)
    mes = Column(Integer)
    arquivo_url = Column(String(255))
    nome_arquivo = Column(String(255))
    criado_em = Column(String(30)) # ISO date

    loja = relationship("Loja")
    caixa = relationship("Caixa")

