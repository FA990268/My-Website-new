import os
import json
import csv
import io
import datetime
import logging
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("jft_cbt_server")

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", 5432))
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASS", "990268moon")
DB_NAME = os.environ.get("DB_NAME", "jft_exam_db")

BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "submissions_backup")
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_pg_connection(dbname: str = "postgres"):
    """Attempts to connect to PostgreSQL with primary password, falling back if needed."""
    try:
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            dbname=dbname
        )
    except psycopg2.OperationalError as e:
        if "password authentication failed" in str(e).lower() and DB_PASS != "990268":
            logger.warning("Primary password failed, trying fallback password '990268'...")
            return psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password="990268",
                dbname=dbname
            )
        raise

def init_db():
    """Initializes PostgreSQL database and creates required relational tables if not present."""
    logger.info(f"Connecting to PostgreSQL ({DB_HOST}:{DB_PORT}) to verify database '{DB_NAME}'...")
    
    # 1. Check/create database in default 'postgres' database
    conn = get_pg_connection("postgres")
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (DB_NAME,))
            if not cur.fetchone():
                logger.info(f"Database '{DB_NAME}' does not exist. Creating database...")
                cur.execute(f'CREATE DATABASE "{DB_NAME}";')
                logger.info(f"Database '{DB_NAME}' created successfully.")
            else:
                logger.info(f"Database '{DB_NAME}' exists.")
    finally:
        conn.close()

    # 2. Connect to jft_exam_db and initialize tables
    conn = get_pg_connection(DB_NAME)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # users Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    candidate_id VARCHAR(100) UNIQUE NOT NULL,
                    full_name VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # exam_submissions Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS exam_submissions (
                    id SERIAL PRIMARY KEY,
                    candidate_id VARCHAR(100) REFERENCES users(candidate_id) ON UPDATE CASCADE,
                    candidate_name VARCHAR(255),
                    total_questions INT DEFAULT 60,
                    total_correct INT,
                    total_wrong INT,
                    total_score INT,
                    raw_submission_json JSONB,
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # submission_answers Table (Question-by-Question Breakdown)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS submission_answers (
                    id SERIAL PRIMARY KEY,
                    submission_id INT REFERENCES exam_submissions(id) ON DELETE CASCADE,
                    question_number INT,
                    section_name VARCHAR(255),
                    question_text TEXT,
                    selected_option VARCHAR(255),
                    correct_option VARCHAR(255),
                    is_correct BOOLEAN,
                    marks_awarded INT
                );
            """)

            # Indexes for high performance
            cur.execute("CREATE INDEX IF NOT EXISTS idx_exam_submissions_cand ON exam_submissions(candidate_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_submission_answers_sub ON submission_answers(submission_id);")

        logger.info(f"Relational tables in '{DB_NAME}' (users, exam_submissions, submission_answers) verified/created successfully.")
    finally:
        conn.close()

def save_exam_submission_to_pg(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates questions, calculates score, upserts user, writes to exam_submissions and submission_answers,
    and stores a backup file on the host in /submissions_backup/.
    """
    candidate_id = str(payload.get("candidate_id") or payload.get("regNo") or f"JFT-{int(datetime.datetime.now().timestamp())}").strip()
    full_name = str(payload.get("full_name") or payload.get("studentName") or "CANDIDATE").strip()
    password = str(payload.get("password") or "123456").strip()

    questions_data = payload.get("questions") or payload.get("answers") or []
    
    evaluated_answers = []
    total_correct = 0
    total_wrong = 0
    total_score = 0
    total_questions = len(questions_data) if questions_data else int(payload.get("total_questions", 60))

    for idx, q in enumerate(questions_data, start=1):
        q_num = q.get("question_number", idx)
        sec_name = q.get("section_name") or q.get("section") or "Section 1"
        q_text = q.get("question_text") or q.get("question") or f"Question #{q_num}"
        
        # Selected option can be string ("A", "1", "Option Text") or index (1, 2, 3, 4)
        raw_sel = q.get("selected_option") if "selected_option" in q else q.get("selected")
        raw_corr = q.get("correct_option") if "correct_option" in q else q.get("correct")
        mark_val = int(q.get("mark") or q.get("marks") or 6)

        options_list = q.get("options") or []
        
        # Normalize selected string
        selected_display = ""
        if raw_sel is not None and str(raw_sel).strip() != "":
            if isinstance(raw_sel, int) and 1 <= raw_sel <= len(options_list):
                selected_display = f"{chr(64 + raw_sel)}: {options_list[raw_sel - 1]}"
            elif str(raw_sel).isdigit() and 1 <= int(raw_sel) <= len(options_list):
                selected_display = f"{chr(64 + int(raw_sel))}: {options_list[int(raw_sel) - 1]}"
            else:
                selected_display = str(raw_sel)
        else:
            selected_display = "Unanswered"

        # Normalize correct string
        correct_display = ""
        if raw_corr is not None:
            if isinstance(raw_corr, int) and 1 <= raw_corr <= len(options_list):
                correct_display = f"{chr(64 + raw_corr)}: {options_list[raw_corr - 1]}"
            elif str(raw_corr).isdigit() and 1 <= int(raw_corr) <= len(options_list):
                correct_display = f"{chr(64 + int(raw_corr))}: {options_list[int(raw_corr) - 1]}"
            else:
                correct_display = str(raw_corr)

        # Evaluation logic
        is_correct = False
        if raw_sel is not None and raw_corr is not None and str(raw_sel).strip() != "":
            if str(raw_sel).strip().lower() == str(raw_corr).strip().lower():
                is_correct = True
            elif selected_display == correct_display and selected_display != "Unanswered":
                is_correct = True
            elif (
                options_list 
                and str(raw_sel).isdigit() 
                and str(raw_corr).isdigit() 
                and int(raw_sel) == int(raw_corr)
            ):
                is_correct = True

        marks_awarded = mark_val if is_correct else 0
        if is_correct:
            total_correct += 1
            total_score += marks_awarded
        else:
            total_wrong += 1

        evaluated_answers.append({
            "question_number": q_num,
            "section_name": sec_name,
            "question_text": q_text,
            "selected_option": selected_display,
            "correct_option": correct_display,
            "is_correct": is_correct,
            "marks_awarded": marks_awarded
        })

    # If payload provided custom total_score from scaled mark
    if "totalScore" in payload and payload["totalScore"] is not None:
        client_score = int(payload["totalScore"])
        if client_score > 0 and total_score == 0:
            total_score = client_score

    # 1. Connect to PostgreSQL and perform relational inserts
    conn = get_pg_connection(DB_NAME)
    try:
        with conn.cursor() as cur:
            # Upsert candidate into users table
            cur.execute("""
                INSERT INTO users (candidate_id, full_name, password)
                VALUES (%s, %s, %s)
                ON CONFLICT (candidate_id) DO UPDATE 
                SET full_name = EXCLUDED.full_name;
            """, (candidate_id, full_name, password))

            # Insert into exam_submissions
            cur.execute("""
                INSERT INTO exam_submissions (
                    candidate_id, candidate_name, total_questions,
                    total_correct, total_wrong, total_score, raw_submission_json
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, submitted_at;
            """, (
                candidate_id, full_name, total_questions,
                total_correct, total_wrong, total_score, Json(payload)
            ))
            sub_row = cur.fetchone()
            submission_id = sub_row[0]
            submitted_at = sub_row[1]

            # Insert detailed question answers into submission_answers
            if evaluated_answers:
                answer_records = [
                    (
                        submission_id,
                        ans["question_number"],
                        ans["section_name"],
                        ans["question_text"],
                        ans["selected_option"],
                        ans["correct_option"],
                        ans["is_correct"],
                        ans["marks_awarded"]
                    )
                    for ans in evaluated_answers
                ]
                cur.executemany("""
                    INSERT INTO submission_answers (
                        submission_id, question_number, section_name,
                        question_text, selected_option, correct_option,
                        is_correct, marks_awarded
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                """, answer_records)

        conn.commit()
    finally:
        conn.close()

    # 2. Save local backup file on host machine in submissions_backup/
    timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_id = "".join(c for c in candidate_id if c.isalnum() or c in ("-", "_"))
    json_filename = f"{clean_id}_{timestamp_str}.json"
    csv_filename = f"{clean_id}_{timestamp_str}.csv"
    
    json_path = os.path.join(BACKUP_DIR, json_filename)
    csv_path = os.path.join(BACKUP_DIR, csv_filename)

    backup_payload = {
        "submission_id": submission_id,
        "candidate_id": candidate_id,
        "candidate_name": full_name,
        "total_questions": total_questions,
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "total_score": total_score,
        "submitted_at": submitted_at.isoformat() if hasattr(submitted_at, "isoformat") else str(submitted_at),
        "detailed_answers": evaluated_answers,
        "raw_payload": payload
    }

    try:
        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump(backup_payload, jf, ensure_ascii=False, indent=2)

        with open(csv_path, "w", encoding="utf-8-sig", newline="") as cf:
            writer = csv.writer(cf)
            writer.writerow(["Question Number", "Section", "Question Text", "Candidate Answer", "Correct Answer", "Result", "Marks Awarded"])
            for ans in evaluated_answers:
                writer.writerow([
                    ans["question_number"],
                    ans["section_name"],
                    ans["question_text"],
                    ans["selected_option"],
                    ans["correct_option"],
                    "CORRECT" if ans["is_correct"] else "WRONG",
                    ans["marks_awarded"]
                ])
        logger.info(f"Local backup files saved successfully: {json_filename}, {csv_filename}")
    except Exception as e:
        logger.error(f"Failed to write local backup files: {e}")

    return {
        "success": True,
        "submission_id": submission_id,
        "candidate_id": candidate_id,
        "candidate_name": full_name,
        "total_questions": total_questions,
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "total_score": total_score,
        "submitted_at": str(submitted_at),
        "backup_json": json_filename,
        "backup_csv": csv_filename
    }

def get_all_submissions_from_pg() -> List[Dict[str, Any]]:
    """Retrieves all submissions ordered by most recent."""
    conn = get_pg_connection(DB_NAME)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    id, candidate_id, candidate_name, total_questions,
                    total_correct, total_wrong, total_score,
                    TO_CHAR(submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at
                FROM exam_submissions
                ORDER BY id DESC;
            """)
            return cur.fetchall()
    finally:
        conn.close()

def get_submission_details_from_pg(submission_id: int) -> Optional[Dict[str, Any]]:
    """Retrieves submission summary, candidate user profile, and all answer sheet rows."""
    conn = get_pg_connection(DB_NAME)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    s.id, s.candidate_id, s.candidate_name, s.total_questions,
                    s.total_correct, s.total_wrong, s.total_score,
                    TO_CHAR(s.submitted_at, 'YYYY-MM-DD HH24:MI:SS') as submitted_at,
                    s.raw_submission_json
                FROM exam_submissions s
                WHERE s.id = %s;
            """, (submission_id,))
            sub = cur.fetchone()
            if not sub:
                return None

            cur.execute("""
                SELECT 
                    question_number, section_name, question_text,
                    selected_option, correct_option, is_correct, marks_awarded
                FROM submission_answers
                WHERE submission_id = %s
                ORDER BY question_number ASC;
            """, (submission_id,))
            answers = cur.fetchall()
            sub["answers"] = answers
            return sub
    finally:
        conn.close()

def generate_submission_csv_content(submission_id: int) -> Optional[str]:
    """Generates CSV string content for a given submission."""
    details = get_submission_details_from_pg(submission_id)
    if not details:
        return None

    output = io.StringIO()
    writer = csv.writer(output)

    # Header summary
    writer.writerow(["JFT-Basic CBT Exam Result Report"])
    writer.writerow(["Candidate ID", details["candidate_id"]])
    writer.writerow(["Candidate Name", details["candidate_name"]])
    writer.writerow(["Submission ID", details["id"]])
    writer.writerow(["Submitted At", details["submitted_at"]])
    writer.writerow(["Total Questions", details["total_questions"]])
    writer.writerow(["Correct Answers", details["total_correct"]])
    writer.writerow(["Wrong Answers", details["total_wrong"]])
    writer.writerow(["Total Score", details["total_score"]])
    writer.writerow([])
    writer.writerow(["#", "Section", "Question", "Candidate Choice", "Correct Answer", "Status", "Marks"])

    for ans in details.get("answers", []):
        writer.writerow([
            ans["question_number"],
            ans["section_name"],
            ans["question_text"],
            ans["selected_option"],
            ans["correct_option"],
            "CORRECT" if ans["is_correct"] else "WRONG",
            ans["marks_awarded"]
        ])

    return output.getvalue()
