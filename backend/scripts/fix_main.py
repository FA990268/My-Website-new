with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('if __name__ == "__main__":')
if pos != -1:
    text = text[:pos]

uvicorn_block = """
if __name__ == "__main__":
    import uvicorn
    import socket
    lan_ips = get_lan_ips()
    primary_ip = lan_ips[0] if lan_ips else "127.0.0.1"
    logger.info("======================================================================")
    logger.info("  JFT-BASIC CBT EXAM SYSTEM & MULTI-SPEAKER TTS SERVER")
    logger.info("======================================================================")
    logger.info("  Local Host Access:   http://localhost:8000")
    logger.info("  LAN Network Access (Other PCs, Tablets, Phones on same Wi-Fi):")
    for ip in lan_ips:
        logger.info(f"    --> http://{ip}:8000")
    logger.info("======================================================================")
    logger.info("  Starting server on 0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
"""

text = text + uvicorn_block

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated server.py main block successfully!")
