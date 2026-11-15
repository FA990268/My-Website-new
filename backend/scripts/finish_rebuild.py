import os
import shutil

target_dir = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server'

with open(r'C:\Users\faruk\.gemini\antigravity\scratch\step_server.py', 'r', encoding='utf-8') as f:
    server_code = f.read()

# Apply edit 827:
target827 = """from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import edge_tts

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jft_cbt_server")

app = FastAPI(title="JFT-Basic Prometric CBT & Multi-Speaker TTS Server", version="3.0.0")"""

replacement827 = """from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel
import edge_tts
import db

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jft_cbt_server")

app = FastAPI(title="JFT-Basic Prometric CBT & Multi-Speaker TTS Server", version="3.0.0")

@app.on_event("startup")
async def startup_event():
    \"\"\"Initializes PostgreSQL database and schema on server start.\"\"\"
    try:
        db.init_db()
        logger.info("PostgreSQL database & tables initialized successfully on startup.")
    except Exception as e:
        logger.warning(f"PostgreSQL initialization note: {e}")"""

if target827 in server_code:
    server_code = server_code.replace(target827, replacement827)
    print("Applied edit 827!")
else:
    print("target827 not found!")

# Apply edit 831:
target831 = """@app.post("/api/exams/submit")
async def submit_exam_result(sub: ExamSubmissionModel):
    \"\"\"Receives and stores student CBT or Model test submissions across the network.\"\"\"
    sub_file = os.path.join(DATA_DIR, "student_submissions.json")
    submissions = []
    if os.path.exists(sub_file):
        try:
            with open(sub_file, "r", encoding="utf-8") as f:
                submissions = json.load(f)
        except Exception:
            submissions = []

    record = sub.model_dump() if hasattr(sub, "model_dump") else sub.dict()
    record["submissionId"] = "sub_" + uuid.uuid4().hex[:8]
    if not record.get("date"):
        record["date"] = asyncio.get_event_loop().time()
    submissions.insert(0, record)

    with open(sub_file, "w", encoding="utf-8") as f:
        json.dump(submissions, f, ensure_ascii=False, indent=2)

    return {"success": True, "submissionId": record["submissionId"]}

@app.get("/api/exams/submissions")
async def get_all_submissions():
    \"\"\"Returns all student submissions for teacher live monitoring.\"\"\"
    sub_file = os.path.join(DATA_DIR, "student_submissions.json")
    if os.path.exists(sub_file):
        with open(sub_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []"""

replacement831 = """@app.post("/api/submit-exam")
@app.post("/api/exams/submit")
async def submit_exam_result(payload: Dict[str, Any]):
    \"\"\"
    Submits student CBT exam results to PostgreSQL (users, exam_submissions, submission_answers),
    evaluates questions, calculates score, and writes a backup file in /submissions_backup/.
    \"\"\"
    try:
        # 1. Save and evaluate in PostgreSQL
        res = db.save_exam_submission_to_pg(payload)

        # 2. Maintain local JSON cache for secondary offline fallback
        try:
            sub_file = os.path.join(DATA_DIR, "student_submissions.json")
            submissions = []
            if os.path.exists(sub_file):
                try:
                    with open(sub_file, "r", encoding="utf-8") as f:
                        submissions = json.load(f)
                except Exception:
                    submissions = []
            record = {
                "id": res["submission_id"],
                "candidate_id": res["candidate_id"],
                "candidate_name": res["candidate_name"],
                "total_questions": res["total_questions"],
                "total_correct": res["total_correct"],
                "total_wrong": res["total_wrong"],
                "total_score": res["total_score"],
                "submitted_at": res["submitted_at"],
                "backup_json": res["backup_json"],
                "backup_csv": res["backup_csv"]
            }
            submissions.insert(0, record)
            with open(sub_file, "w", encoding="utf-8") as f:
                json.dump(submissions, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Could not update offline student_submissions.json: {e}")

        return res
    except Exception as e:
        logger.error(f"Error submitting exam to PostgreSQL: {e}")
        raise HTTPException(status_code=500, detail=f"Database submission failed: {str(e)}")

@app.get("/api/submissions")
@app.get("/api/exams/submissions")
async def get_all_submissions():
    \"\"\"Returns all student submissions from PostgreSQL for teacher live monitoring.\"\"\"
    try:
        subs = db.get_all_submissions_from_pg()
        return subs
    except Exception as e:
        logger.warning(f"PostgreSQL fetch failed ({e}), falling back to local JSON file...")
        sub_file = os.path.join(DATA_DIR, "student_submissions.json")
        if os.path.exists(sub_file):
            with open(sub_file, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

@app.get("/api/submissions/latest")
async def get_latest_submission():
    \"\"\"Returns the latest submission ID and timestamp for admin auto-download polling.\"\"\"
    try:
        subs = db.get_all_submissions_from_pg()
        if subs:
            top = subs[0]
            return {
                "latest_id": top["id"],
                "candidate_id": top["candidate_id"],
                "candidate_name": top["candidate_name"],
                "submitted_at": top["submitted_at"]
            }
        return {"latest_id": 0}
    except Exception as e:
        logger.error(f"Error fetching latest submission: {e}")
        return {"latest_id": 0}

@app.get("/api/submissions/{sub_id}")
async def get_submission_details(sub_id: int):
    \"\"\"Returns detailed breakdown of all questions, candidate choices, correct answers, and scores.\"\"\"
    try:
        details = db.get_submission_details_from_pg(sub_id)
        if not details:
            raise HTTPException(status_code=404, detail="Submission not found")
        return details
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching submission details: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/submissions/{sub_id}/download")
async def download_submission(sub_id: int, format: str = Query("json")):
    \"\"\"
    Downloads complete raw submission in JSON, CSV, or formatted report format.
    Format options: 'json', 'csv'.
    \"\"\"
    try:
        details = db.get_submission_details_from_pg(sub_id)
        if not details:
            raise HTTPException(status_code=404, detail="Submission not found")

        cand_id = "".join(c for c in str(details["candidate_id"]) if c.isalnum() or c in ("-", "_"))
        fmt = format.lower().strip()

        if fmt == "csv":
            csv_content = db.generate_submission_csv_content(sub_id)
            if not csv_content:
                raise HTTPException(status_code=500, detail="Failed to generate CSV")
            filename = f"JFT_Submission_{cand_id}_{sub_id}.csv"
            return Response(
                content=csv_content.encode("utf-8-sig"),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
        else: # default json
            filename = f"JFT_Submission_{cand_id}_{sub_id}_raw.json"
            json_bytes = json.dumps(details, ensure_ascii=False, indent=2).encode("utf-8")
            return Response(
                content=json_bytes,
                media_type="application/json",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))"""

if target831 in server_code:
    server_code = server_code.replace(target831, replacement831)
    print("Applied edit 831!")
else:
    print("target831 not found!")

# Save server.py
with open(os.path.join(target_dir, 'server.py'), 'w', encoding='utf-8') as f:
    f.write(server_code)

print("Saved server.py successfully!")

# Copy latest static/index.html from Desktop
desktop_html = r'C:\Users\faruk\Desktop\Jft Test\index.html'
shutil.copy2(desktop_html, os.path.join(target_dir, 'static', 'index.html'))
print("Copied latest index.html to jft-cbt-exam-server/static/index.html!")

# Copy assets if available
if os.path.exists(r'C:\Users\faruk\Desktop\Jft Test\assets'):
    dest_assets = os.path.join(target_dir, 'static', 'assets')
    if os.path.exists(dest_assets):
        shutil.rmtree(dest_assets)
    shutil.copytree(r'C:\Users\faruk\Desktop\Jft Test\assets', dest_assets)
    print("Copied assets to static/assets!")
