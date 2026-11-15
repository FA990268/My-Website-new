import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    user="postgres",
    password="990268moon",
    database="jft-cbt_Portal"
)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
tables = [row[0] for row in cur.fetchall()]
print("Tables in jft-cbt_Portal:", tables)

for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM \"{t}\";")
    cnt = cur.fetchone()[0]
    print(f"Table {t}: {cnt} rows")

conn.close()
