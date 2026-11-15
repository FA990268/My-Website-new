import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    user="postgres",
    password="990268moon",
    database="postgres"
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

cur.execute("SELECT datname FROM pg_database WHERE datname='jft_cbt_portal';")
if not cur.fetchone():
    print("Creating database jft_cbt_portal...")
    cur.execute("CREATE DATABASE jft_cbt_portal;")
    print("Database jft_cbt_portal created!")
else:
    print("Database jft_cbt_portal already exists!")

conn.close()
