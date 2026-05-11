from sqlalchemy import create_engine, text
import os

# Check if there is an environment variable
db_url = os.getenv("DATABASE_URL")
print(f"ENV DATABASE_URL: {db_url}")

# List all databases if possible (MySQL)
try:
    engine = create_engine("mysql+pymysql://portald3_user:gWh28%40dGcMp@localhost/?charset=utf8mb4")
    with engine.connect() as conn:
        res = conn.execute(text("SHOW DATABASES"))
        print("--- DATABASES ---")
        for r in res:
            print(r[0])
except Exception as e:
    print(f"Error listing DBs: {e}")

# Check local sqlite
if os.path.exists("database.db"):
    print("Found local database.db")
else:
    print("No local database.db")

# Search for any file named .env
import glob
print(f"Search for .env files: {glob.glob('**/.*env*', recursive=True)}")
