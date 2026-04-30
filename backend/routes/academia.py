from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import SessionLocal
from models import Indicador, Pessoa, Transacao
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/academia", tags=["academia"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class IndicadorCreate(BaseModel):
    nome: str
    telefone: Optional[str] = None
    pix: Optional[str] = None
    banco_info: Optional[str] = None
    loja_id: int

class IndicadorResponse(BaseModel):
    id: int
    nome: str
    telefone: Optional[str] = None
    pix: Optional[str] = None
    banco_info: Optional[str] = None
    loja_id: Optional[int] = None

    class Config:
        from_attributes = True

@router.get("/indicadores/{loja_id}", response_model=List[IndicadorResponse])
def listar_indicadores(loja_id: int, db: Session = Depends(get_db)):
    return db.query(Indicador).filter(Indicador.loja_id == loja_id).all()

@router.post("/indicadores", response_model=IndicadorResponse)
def criar_indicador(indicador: IndicadorCreate, db: Session = Depends(get_db)):
    novo = Indicador(**indicador.model_dump())
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo

@router.get("/comissoes/{loja_id}")
def listar_comissoes(loja_id: int, db: Session = Depends(get_db)):
    # Busca todos os indicadores da loja
    indicadores = db.query(Indicador).filter(Indicador.loja_id == loja_id).all()
    
    resultado = []
    for ind in indicadores:
        # Busca pessoas indicadas por este indicador
        indicados = db.query(Pessoa).filter(Pessoa.indicador_id == ind.id).all()
        
        detalhes_indicados = []
        total_joia_paga_indicados = 0.0
        
        for p in indicados:
            # Soma quanto esse indicado já pagou de Joia
            pago = db.execute(text(
                "SELECT COALESCE(SUM(valor),0) FROM transacoes WHERE pessoa_id = :pid AND categoria = 'joia' AND status = 'pago'"
            ), {"pid": p.id}).fetchone()[0]
            
            pago = float(pago)
            total_joia_paga_indicados += pago
            
            detalhes_indicados.append({
                "id": p.id,
                "nome": p.nome,
                "joia_paga": pago,
                "comissao_gerada": pago * 0.5
            })
            
        resultado.append({
            "indicador_id": ind.id,
            "nome": ind.nome,
            "telefone": ind.telefone,
            "pix": ind.pix,
            "banco_info": ind.banco_info,
            "quantidade_indicados": len(indicados),
            "total_joia_paga": total_joia_paga_indicados,
            "total_comissao": total_joia_paga_indicados * 0.5,
            "indicados": detalhes_indicados
        })
        
    return resultado
