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

try:
    conn = pymysql.connect(host=host, user=user, password=password, database=db_name)
    with conn.cursor() as cursor:
        print("Checking SHOW PROCESSLIST:")
        cursor.execute("SHOW PROCESSLIST")
        for row in cursor.fetchall():
            print(row)
            
        print("\nChecking connection count:")
        cursor.execute("SHOW STATUS LIKE 'Threads_connected'")
        print(cursor.fetchone())

        cursor.execute("SHOW VARIABLES LIKE 'max_connections'")
        print(cursor.fetchone())
    conn.close()
except Exception as e:
    print(f"Error connecting: {e}")
