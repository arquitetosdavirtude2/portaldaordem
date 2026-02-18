import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os

# Read Postgres config
try:
    with open("postgres_creds.txt", "r") as f:
        pg_url = f.read().strip()
    # Parse URL: postgresql://user:pass@host:port/dbname
    # Simple parsing for script usage
    import re
    m = re.match(r"postgresql://(.*?):(.*?)\@(.*?):(.*?)/(.*)", pg_url)
    if not m:
        raise ValueError("Invalid URL format in postgres_creds.txt")
    pg_user, pg_pass, pg_host, pg_port, pg_db = m.groups()
except FileNotFoundError:
    print("Postgres credentials not found. Run setup_postgres.py first.")
    exit(1)

# Connect to SQLite
sqlite_path = "database.db"
if not os.path.exists(sqlite_path):
    print(f"SQLite DB not found at {sqlite_path}")
    exit(1)

conn_lite = sqlite3.connect(sqlite_path)
conn_lite.row_factory = sqlite3.Row
cur_lite = conn_lite.cursor()

# Connect to Postgres
try:
    conn_pg = psycopg2.connect(
        user=pg_user, password=pg_pass, host=pg_host, port=pg_port, dbname=pg_db
    )
    conn_pg.autocommit = False
    cur_pg = conn_pg.cursor()
except Exception as e:
    print(f"Failed to connect to Postgres: {e}")
    exit(1)

print("Connected to both databases.")

def migrate_table(table_name, columns, conflict_col=None):
    print(f"Migrating {table_name}...")
    
    # Select from SQLite
    cols_str = ", ".join(columns)
    cur_lite.execute(f"SELECT {cols_str} FROM {table_name}")
    rows = cur_lite.fetchall()
    
    if not rows:
        print(f"  No data in {table_name}.")
        return

    # Prepare data for insertion
    data = [tuple(row[col] for col in columns) for row in rows]
    
    # Insert into Postgres
    placeholders = ", ".join(["%s"] * len(columns))
    insert_query = f"INSERT INTO {table_name} ({cols_str}) VALUES %s"
    if conflict_col:
        insert_query += f" ON CONFLICT ({conflict_col}) DO NOTHING"
    
    try:
        execute_values(cur_pg, insert_query, data)
        print(f"  Inserted {len(data)} rows.")
    except Exception as e:
        print(f"  Error migrating {table_name}: {e}")
        conn_pg.rollback()
        return

    # Update sequence
    if 'id' in columns:
        try:
            cur_pg.execute(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), coalesce(max(id), 1)) FROM {table_name}")
            print("  Sequence updated.")
        except Exception:
            pass # Tables without serial id or sequence issue

# 0. Sync Schema (Using SQLAlchemy logic or manual creation - usually backend starts and creates, but we need empty tables first)
# For simplicity, let's assume the App verifies schema on startup. But we need tables NOW to insert.
# Let's create tables via SQL manually to be sure.

print("Creating Schema in Postgres...")
schema_sql = """
CREATE TABLE IF NOT EXISTS estados (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(2) UNIQUE NOT NULL,
    nome VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    senha_master VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    login VARCHAR(100) UNIQUE,
    senha VARCHAR(100),
    role VARCHAR(20) DEFAULT 'mestre'
);

CREATE TABLE IF NOT EXISTS usuario_estados (
    usuario_id INTEGER REFERENCES usuarios(id),
    estado_id INTEGER REFERENCES estados(id)
);

CREATE TABLE IF NOT EXISTS pessoas (
    id SERIAL PRIMARY KEY,
    estado_id INTEGER REFERENCES estados(id),
    nome VARCHAR(100),
    telefone VARCHAR(20),
    status VARCHAR(30) DEFAULT 'Profano'
);
"""
cur_pg.execute(schema_sql)
conn_pg.commit()

# 1. Migrate Data
migrate_table('estados', ['id', 'sigla', 'nome'], 'sigla')
migrate_table('admin', ['id', 'senha_master'])
migrate_table('usuarios', ['id', 'nome', 'login', 'senha', 'role'], 'login')
migrate_table('usuario_estados', ['usuario_id', 'estado_id'])
migrate_table('pessoas', ['id', 'estado_id', 'nome', 'telefone', 'status'])

conn_pg.commit()
print("Migration Complete.")

cur_lite.close()
conn_lite.close()
cur_pg.close()
conn_pg.close()
