uvicorn_block = """

if __name__ == "__main__":
    import uvicorn
    primary_ip = get_primary_lan_ip()
    logger.info("======================================================================")
    logger.info("  JFT-BASIC CBT EXAM SYSTEM & MULTI-SPEAKER TTS SERVER")
    logger.info("======================================================================")
    logger.info("  Local Host Access:   http://localhost:8000")
    logger.info("  LAN Network Access (Other PCs, Tablets, Phones on same Wi-Fi):")
    logger.info(f"    --> http://{primary_ip}:8000")
    logger.info("======================================================================")
    logger.info("  Starting server on 0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
"""

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\server.py', 'a', encoding='utf-8') as f:
    f.write(uvicorn_block)

print("Appended uvicorn start block to server.py!")
