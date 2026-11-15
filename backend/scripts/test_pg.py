import psycopg2

passwords = ['990268moon', '990268', 'postgres', 'admin', 'root']

for pw in passwords:
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=pw,
            database="postgres"
        )
        print(f"SUCCESS with password: {pw}")
        cur = conn.cursor()
        cur.execute("SELECT datname FROM pg_database;")
        dbs = [row[0] for row in cur.fetchall()]
        print("Databases:", dbs)
        conn.close()
        break
    except Exception as e:
        print(f"Failed with {pw}: {e}")
