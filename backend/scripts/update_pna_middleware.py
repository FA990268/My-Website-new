with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_cors = """# Enable CORS for multi-user local LAN access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)"""

new_cors = """# Custom High-Compatibility CORS & Private Network Access (PNA) Middleware
@app.middleware("http")
async def cors_pna_middleware(request, call_next):
    if request.method == "OPTIONS":
        origin = request.headers.get("origin") or "*"
        headers_req = request.headers.get("access-control-request-headers", "*")
        res = Response(status_code=200)
        res.headers["Access-Control-Allow-Origin"] = origin
        res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        res.headers["Access-Control-Allow-Headers"] = headers_req
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Max-Age"] = "86400"
        if request.headers.get("access-control-request-private-network") == "true":
            res.headers["Access-Control-Allow-Private-Network"] = "true"
        return res

    response = await call_next(request)
    origin = request.headers.get("origin") or "*"
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "*"
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)"""

if old_cors in text:
    text = text.replace(old_cors, new_cors)
    print("Replaced CORS middleware successfully!")
else:
    print("old_cors not found!")

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved server.py with PNA middleware!")
