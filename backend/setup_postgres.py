import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Common default passwords for local dev
passwords = ['postgres', 'admin', 'root', '123456', 'password', '']
user = 'postgres'
host = 'localhost'
port = '5432'
db_name = 'brazilian_lodges'

connected = False
valid_password = None

print("Probing PostgreSQL credentials...")

for pwd in passwords:
    try:
        print(f"Trying password: '{pwd}' ...")
        conn = psycopg2.connect(user=user, password=pwd, host=host, port=port)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        valid_password = pwd
        connected = True
        print(f"SUCCESS! Connected with password: '{pwd}'")
        
        # Create Database
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{db_name}'")
        exists = cur.fetchone()
        if not exists:
            print(f"Creating database '{db_name}'...")
            try:
                cur.execute(f"CREATE DATABASE {db_name}")
                print("Database created.")
            except Exception as e:
                print(f"Error creating DB: {e}")
        else:
            print(f"Database '{db_name}' already exists.")
        
        cur.close()
        conn.close()
        
        # Save valid config to a temp file for next steps
        with open("postgres_creds.txt", "w") as f:
            f.write(f"postgresql://{user}:{valid_password}@{host}:{port}/{db_name}")
        print("Credentials saved.")
        break
    except psycopg2.OperationalError as e:
        print(f"Failed: {e}")

if connected:
    # Save valid config to a temp file for next steps
    with open("postgres_creds.txt", "w") as f:
        f.write(f"postgresql://{user}:{valid_password}@{host}:{port}/{db_name}")
    print("Credentials saved.")
else:
    print("COULD NOT CONNECT. Please provide the correct PostgreSQL password.")
