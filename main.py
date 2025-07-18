"""FastAPI service for generating coding tasks via OpenRouter and evaluating user
solutions. The code is structured in a single file for simplicity, but can be
split into modules later (api, llm, storage, utils, etc.).
"""
from __future__ import annotations

import sqlite3
import bcrypt
from pydantic import EmailStr
from database import get_notification_settings, update_notification_settings

from database import init_db

import asyncio
import json
import logging
import os
import re
from json import JSONDecodeError
from pathlib import Path
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from jwt_utils import create_user_token, get_current_user
import smtplib
from email.mime.text import MIMEText
from apscheduler.schedulers.background import BackgroundScheduler
from database import get_users_with_notifications_enabled, update_last_notification_date
import atexit

def scheduled_notifications_job():
    users = get_users_with_notifications_enabled()
    for user_id, email, login in users:
        send_email_notification(email, login)
        update_last_notification_date(user_id)

# ---------------------------------------------------------------------------
# Configuration & constants
# ---------------------------------------------------------------------------

load_dotenv()

API_URL: str = "https://openrouter.ai/api/v1/chat/completions"
MODEL_NAME: str = "deepseek/deepseek-r1-0528-qwen3-8b:free"

# Retry / timeout parameters
MAX_RETRIES: int = 5       # attempts for both task generation & evaluation
MAX_ATTEMPTS: int = 5      # attempts for reparsing LLM evaluation output
BASE_DELAY: float = 0.5    # seconds between evaluation retries
REQUEST_TIMEOUT: int = 30  # seconds for the HTTP call to OpenRouter

# Files & dirs
BASE_DIR: Path = Path(__file__).parent
SYLLABUS_FILE: Path = BASE_DIR / "syllabus.json"
DB_PATH = str(BASE_DIR / "users.db")

# Logging
logger = logging.getLogger("app")
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_api_key() -> str:
    """Fetch OpenRouter API key from environment variables."""

    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable not set")
    return key


def call_openrouter(prompt: str, *, timeout: int = REQUEST_TIMEOUT) -> Dict[str, Any]:
    """Send a single prompt to OpenRouter and return the raw JSON response."""

    headers = {
        "Authorization": f"Bearer {_get_api_key()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
    }
    response = requests.post(API_URL, json=payload, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()


def extract_json_from_llm(text: str) -> Dict[str, Any]:
    """Extract the *first* JSON object from an LLM reply.

    Steps:
    1. Remove optional markdown fences ```json ... ```
    2. Take everything between the *first* "{" and the *last* "}".
    3. Parse it with :pyfunc:`json.loads` and return a ``dict``.

    Raises
    ------
    ValueError
        If no JSON block can be detected or the content is empty.
    JSONDecodeError
        If the extracted substring is not a valid JSON document.
    """

    if not text or not text.strip():
        raise ValueError("LLM returned an empty string")

    # 1) Strip markdown fences
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.I)
    body = fenced.group(1) if fenced else text
    body = body.strip()

    # 2) Keep everything between the first "{" and the last "}"
    start, end = body.find("{"), body.rfind("}") + 1
    if start == -1 or end <= start:
        raise ValueError("No JSON object found in the response")

    # 3) Parse
    return json.loads(body[start:end])


async def _call_llm_async(prompt: str) -> str:
    """Return the ``content`` field from an OpenRouter response.

    The blocking HTTP call is performed directly; consider moving it to a
    thread pool (``asyncio.to_thread``) or using an async HTTP client in
    production to avoid blocking the event loop.
    """

    result = call_openrouter(prompt)
    return result["choices"][0]["message"].get("content", "")


# ---------------------------------------------------------------------------
# FastAPI setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Coding Tasks API")
# for creating an user table
init_db() 
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- APScheduler setup ---
scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_notifications_job, 'interval', minutes=1)
scheduler.start()
atexit.register(lambda: scheduler.shutdown())

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class SyllabusIn(BaseModel):
    topics: List[str]

# ---------------------------------------------------------------------------
# Syllabus endpoints
# ---------------------------------------------------------------------------

@app.post("/save_syllabus")
async def save_syllabus(data: SyllabusIn):
    """Save syllabus topics to *syllabus.json*."""

    try:
        with SYLLABUS_FILE.open("w", encoding="utf-8") as f_out:
            json.dump({"topics": data.topics}, f_out, ensure_ascii=False, indent=2)
    except Exception as exc:  # pylint: disable=broad-except
        logger.exception("Failed to save syllabus")
        raise HTTPException(500, f"Couldn't save syllabus: {exc}")
    return {"message": "Syllabus saved"}


@app.get("/get_syllabus")
async def get_syllabus():
    """Return list of topics from *syllabus.json* (empty if missing)."""

    if not SYLLABUS_FILE.exists():
        return {"topics": []}

    try:
        with SYLLABUS_FILE.open("r", encoding="utf-8") as f_in:
            data = json.load(f_in)
        topics = data.get("topics")
        if not isinstance(topics, list):
            topics = []
    except Exception:  # pylint: disable=broad-except
        logger.exception("Failed to read syllabus")
        topics = []

    return {"topics": topics}

# ---------------------------------------------------------------------------
# Task generation endpoint
# ---------------------------------------------------------------------------

@app.get("/generate_task")
async def generate_task(topic: str, difficulty: str):
    """Generate a single programming task in JSON format."""

    prompt = (
        f"Create one Python programming task on '{topic}' with '{difficulty}' difficulty.\n"
        "Respond ONLY with valid JSON (no markdown, no explanations).\n"
        "Do NOT use Python tuples like ('a', 1). Use JSON arrays like [\"a\", 1].\n"
        "Use double quotes for all strings (not single quotes).\n"
        "The structure must be:\n"
        "{\n"
        "  \"Task name\": string,\n"
        "  \"Task description\": string,\n"
        "  \"Sample input cases\": [ {\"input\": \"<in>\", \"expected_output\": \"<out>\"} ],\n"
        "  \"Hints\": {\n"
        "    \"Hint1\": \"general concept\",\n"
        "    \"Hint2\": \"solution logic\",\n"
        "    \"Hint3\": \"partial solution or specific guidance\"\n"
        "  }\n"
        "}\n"
        "Each subsequent hint must be more specific than the previous one (e.g., concept -> logic -> partial guidance).\n"
        "The first hint MUST be about general concept, the second hint MUST be about solution logic, the third hint MUST\n"
        "be about partial guidance to solution.\n"
        "All hint keys MUST be present and use exact casing: \"Hint1\", \"Hint2\", \"Hint3\".\n"
        "Each hint MUST be meaningful. Do NOT leave any hint blank or undefined."
    )

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = call_openrouter(prompt)
            task_str = result["choices"][0]["message"]["content"].strip()
            json.loads(task_str)  # validate JSON
            return JSONResponse({"task": task_str})
        except JSONDecodeError as exc:
            last_error = exc
            logger.warning("[generate_task] JSONDecodeError (%d/%d): %s", attempt, MAX_RETRIES, exc)
            if attempt < MAX_RETRIES:
                continue
        except requests.exceptions.HTTPError as http_err:
            if http_err.response.status_code == 401:
                raise HTTPException(401, "Invalid API Key")
            raise HTTPException(500, str(http_err))
        except Exception as exc:  # pylint: disable=broad-except
            raise HTTPException(500, str(exc))

    raise HTTPException(500, f"Failed to get valid JSON after {MAX_RETRIES} attempts: {last_error}")


# ---------------------------------------------------------------------------
# Evaluation endpoints
# ---------------------------------------------------------------------------

@app.post("/submit_code")
async def submit_code_alias(request: Request):
    """Proxy to :func:`evaluate_code` for backward compatibility."""

    return await evaluate_code(request)


@app.post("/evaluate_code")
async def evaluate_code(request: Request):
    """Evaluate user solution using LLM and retry on malformed JSON.

    Expected request body::

        {
            "task": "...",  # full task description
            "code": "..."   # user Python code
        }
    """

    data = await request.json()
    task: str = data.get("task", "")
    code: str = data.get("code", "")

    eval_prompt = (
            f"Task:\n{task}\n\n"
            f"User message:\n {code}\n"
            "Check if the user message is a code solution or question regarding task\n"
            "If the message is a question - respond with a JSON object with fields: 'question': true, 'feedback': answer for the question. Do not give away solution, only help with understanding task requirements"
            "If the message is a code solution - Analyze the above code for correctness against the task requirements. "
            "Respond with a JSON object with fields: 'question': false 'correct': true or false, 'feedback': a brief explanation (only if correct is false, if true - make a compliment). Do not include additional comments or formatting"
        ) 


    llm_raw: str = ""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            llm_raw = await _call_llm_async(eval_prompt)
            evaluation = extract_json_from_llm(llm_raw)
            return JSONResponse(evaluation)  # success
        except (ValueError, JSONDecodeError) as exc:
            logger.warning("Attempt %d/%d: cannot parse LLM response (%s)", attempt, MAX_ATTEMPTS, exc)
            logger.debug("Raw answer:\n%s", llm_raw)
            if attempt < MAX_ATTEMPTS:
                await asyncio.sleep(BASE_DELAY * attempt)
                continue

    # All attempts exhausted — return graceful fallback
    return JSONResponse(
        {
            "correct": False,
            "feedback": (
                "⚠️ It was not possible to evaluate the solution because the LLM returned malformed output. "
                "Please try again later."
            ),
        }
    )


# ---------------------------------------------------------------------------
# Static HTML
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve client SPA (static/index.html)."""

    index_path = Path("static/index.html")
    if not index_path.exists():
        return HTMLResponse("<h1>No frontend found</h1>", status_code=404)
    return HTMLResponse(index_path.read_text(encoding="utf-8"))

# ---------------------------------------------------------------------------
# Login and Sign up
# ---------------------------------------------------------------------------

class SignupInput(BaseModel):
    email: EmailStr
    login: str
    password: str

class LoginInput(BaseModel):
    identifier: str  # can be email or login
    password: str

class NotificationSettings(BaseModel):
    enabled: bool
    notification_time: str  # Format: "HH:MM"
    notification_days: list[int]  # 1=Monday, 7=Sunday

@app.post("/signup")
async def signup(user: SignupInput):
    if not user.email.lower().endswith("@innopolis.university"):
        raise HTTPException(status_code=400, detail="Only @innopolis.university emails allowed")

    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM users WHERE LOWER(email) = ?", (user.email.lower(),))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")

            cursor.execute("SELECT 1 FROM users WHERE LOWER(login) = ?", (user.login.lower(),))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Login already taken")

            hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
            cursor.execute(
                "INSERT INTO users (email, login, password_hash, registration_date) VALUES (?, ?, ?, datetime('now'))",
                (user.email.lower(), user.login.lower(), hashed)
            )
            conn.commit()
        return {"name": user.login}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=500, detail="Internal DB error")

@app.post("/login")
async def login(data: LoginInput):
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, login, email, password_hash FROM users WHERE LOWER(email) = ? OR LOWER(login) = ?",
            (data.identifier.lower(), data.identifier.lower())
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user_id, login_name, email, password_hash = row
        if not bcrypt.checkpw(data.password.encode(), password_hash.encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create JWT token
        token = create_user_token(user_id, login_name, email)
        
        return {
            "name": login_name,
            "token": token,
            "user_id": user_id
        }

# ---------------------------------------------------------------------------
# Notification Settings Endpoints
# ---------------------------------------------------------------------------

@app.get("/notification-settings")
async def get_notification_settings_endpoint(current_user: dict = Depends(get_current_user)):
    """Get notification settings for the current user."""
    user_id = int(current_user["sub"])
    settings = get_notification_settings(user_id)
    return settings

@app.post("/notification-settings")
async def update_notification_settings_endpoint(
    settings: NotificationSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update notification settings for the current user."""
    user_id = int(current_user["sub"])
    
    # Validate time format
    try:
        hour, minute = map(int, settings.notification_time.split(":"))
        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("Invalid time format")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")
    
    # Validate days
    for day in settings.notification_days:
        if not (1 <= day <= 7):
            raise HTTPException(status_code=400, detail="Invalid day. Use 1-7 (Monday=1, Sunday=7)")
    
    update_notification_settings(
        user_id,
        settings.enabled,
        settings.notification_time,
        settings.notification_days
    )
    
    return {"message": "Notification settings updated successfully"}

@app.post("/send-notification")
async def send_notification(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("email")
    user_name = current_user.get("username")
    if not user_email:
        raise HTTPException(status_code=400, detail="No email found for user")

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", smtp_user)
    app_name = os.getenv("APP_NAME", "Study Buddy")

    msg = MIMEText(f"Hi {user_name}! This is your notification from {app_name}.")
    msg["Subject"] = f"{app_name} Notification"
    msg["From"] = from_email
    msg["To"] = user_email

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [user_email], msg.as_string())
        return {"message": f"Notification sent to {user_email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

def send_email_notification(user_email, user_name):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", smtp_user)
    app_name = os.getenv("APP_NAME", "Study Buddy")

    msg = MIMEText(f"Hi {user_name}! This is your notification from {app_name}.")
    msg["Subject"] = f"{app_name} Notification"
    msg["From"] = from_email
    msg["To"] = user_email

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [user_email], msg.as_string())
        logger.info(f"Notification sent to {user_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {e}")


# ---------------------------------------------------------------------------
# Entry point (for `python main.py`)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=False)
