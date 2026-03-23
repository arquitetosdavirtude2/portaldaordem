import os
import pymysql
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found")
    exit(1)

# mysql+pymysql://user:pass@host:port/db
url = urllib.parse.urlparse(DATABASE_URL.replace("mysql+pymysql://", "http://"))
host = url.hostname
user = url.username
password = urllib.parse.unquote(url.password) if url.password else ""
db_name = url.path[1:]

print(f"Connecting to host: {host}, db: {db_name}, user: {user}")

try:
    conn = pymysql.connect(host=host, user=user, password=password, database=db_name)
    with conn.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print("Tabelas encontradas:")
        for t in tables:
            print(t[0])
    conn.close()
except Exception as e:
    print(f"Error: {e}")
