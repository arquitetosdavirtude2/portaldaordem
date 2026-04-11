"""
Migração cargos - versão robusta com verificação de estado atual.
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", ".env"))
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Conectando: {DATABASE_URL[:40]}...")
engine = create_engine(DATABASE_URL)

CARGOS = [
    (1,  "Venerável Mestre",        1),
    (2,  "1º Vigilante",            1),
    (3,  "2º Vigilante",            1),
    (4,  "Orador",                  0),
    (5,  "Secretário",              0),
    (6,  "Tesoureiro",              0),
    (7,  "Chanceler",               0),
    (8,  "Hospitaleiro",            0),
    (9,  "Mestre de Cerimônias",    0),
    (10, "1º Diácono",              0),
    (11, "2º Diácono",              0),
    (12, "Organista",               0),
    (13, "Auxiliar de Secretário",  0),
    (14, "Auxiliar de Tesoureiro",  0),
    (15, "Guarda Interno",          0),
    (16, "Guarda Externo",          0),
]

with engine.connect() as conn:

    # 1. Criar tabela cargos
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cargos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(100) NOT NULL UNIQUE,
                isento_contribuicao TINYINT(1) NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """))
        conn.commit()
        print("✅ Tabela 'cargos' OK")
    except Exception as e:
        print(f"⚠️  Criar cargos: {e}")

    # 2. Inserir cargos
    for c in CARGOS:
        try:
            conn.execute(text("""
                INSERT INTO cargos (id, nome, isento_contribuicao)
                VALUES (:id, :nome, :isento)
                ON DUPLICATE KEY UPDATE nome=VALUES(nome), isento_contribuicao=VALUES(isento_contribuicao)
            """), {"id": c[0], "nome": c[1], "isento": c[2]})
        except Exception as e:
            print(f"  ⚠️  [{c[0]}] {c[1]}: {e}")
        else:
            print(f"  ✅ [{c[0]}] {c[1]}")
    conn.commit()

    # 3. Verificar se cargo_id já existe em pessoas
    cols = [r[0] for r in conn.execute(text("DESCRIBE pessoas")).fetchall()]
    print(f"\nColunas atuais de pessoas: {cols}")

    if "cargo_id" not in cols:
        print("\nAdicionando coluna cargo_id...")
        try:
            conn.execute(text("ALTER TABLE pessoas ADD COLUMN cargo_id INT NULL"))
            conn.commit()
            print("  ✅ cargo_id adicionado")
        except Exception as e:
            print(f"  ❌ Falhou: {e}")
    else:
        print("✅ cargo_id já existe")

    # 4. Verificar se FK já existe
    fk_rows = conn.execute(text("""
        SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pessoas'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
          AND CONSTRAINT_NAME = 'fk_pessoas_cargo'
    """)).fetchall()

    if not fk_rows:
        print("\nAdicionando FK fk_pessoas_cargo...")
        try:
            conn.execute(text("""
                ALTER TABLE pessoas
                ADD CONSTRAINT fk_pessoas_cargo
                FOREIGN KEY (cargo_id) REFERENCES cargos(id)
                ON DELETE SET NULL
            """))
            conn.commit()
            print("  ✅ FK adicionada")
        except Exception as e:
            print(f"  ⚠️  FK: {e}")
    else:
        print("✅ FK já existe")

    # 5. Migrar cargo (texto) -> cargo_id
    if "cargo" in cols:
        print("\nMigrando cargo textual -> cargo_id...")
        try:
            result = conn.execute(text("""
                UPDATE pessoas p
                JOIN cargos c ON p.cargo = c.nome
                SET p.cargo_id = c.id
                WHERE p.cargo IS NOT NULL AND (p.cargo_id IS NULL OR p.cargo_id = 0)
            """))
            conn.commit()
            print(f"  ✅ {result.rowcount} pessoa(s) migrada(s)")
        except Exception as e:
            print(f"  ⚠️  {e}")

        # 6. Remover coluna antiga
        print("\nRemovendo coluna 'cargo'...")
        try:
            conn.execute(text("ALTER TABLE pessoas DROP COLUMN cargo"))
            conn.commit()
            print("  ✅ Removida")
        except Exception as e:
            print(f"  ⚠️  {e}")
    else:
        print("\n✅ Coluna 'cargo' já foi removida anteriormente")

    # 7. Verificação final
    print("\n=== VERIFICAÇÃO FINAL ===")
    rows = conn.execute(text("""
        SELECT p.id, p.nome, COALESCE(c.nome, 'Sem cargo') as cargo, COALESCE(c.isento_contribuicao, 0) as isento
        FROM pessoas p
        LEFT JOIN cargos c ON p.cargo_id = c.id
        ORDER BY p.id
    """)).fetchall()
    for r in rows:
        print(f"  [{r[0]}] {r[1]:<35} cargo={r[2]:<25} isento={r[3]}")

    total = conn.execute(text("SELECT COUNT(*) FROM cargos")).fetchone()[0]
    print(f"\nTotal de cargos cadastrados: {total}")

print("\n🎉 Migração concluída!")
