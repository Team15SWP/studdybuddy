import os
from pathlib import Path
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List
import json
from json import JSONDecodeError

load_dotenv()

API_URL = "https://openrouter.ai/api/v1/chat/completions"
def get_api_key():
    key = os.getenv("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable not set")
    return key

def call_openrouter(prompt: str, timeout: int = 30) -> dict:
    headers = {
        "Authorization": f"Bearer {get_api_key()}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
        "messages": [{"role": "user", "content": prompt}],
    }
    resp = requests.post(API_URL, json=payload, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.json()

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Syllabus persistence
BASE_DIR      = Path(__file__).parent
SYLLABUS_FILE = BASE_DIR / "syllabus.json"

class SyllabusIn(BaseModel):
    topics: List[str]

@app.post("/save_syllabus")
async def save_syllabus(data: SyllabusIn):
    """
    Принимает JSON { "topics": [ ... ] } и сохраняет в syllabus.json
    """
    try:
        with open(SYLLABUS_FILE, "w", encoding="utf-8") as f:
            json.dump({"topics": data.topics}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(500, f"Не удалось сохранить syllabus: {e}")
    return {"message": "Syllabus saved"}

@app.get("/get_syllabus")
async def get_syllabus():
    """
    Отдаёт {"topics": [...]}, либо пустой список, если файла ещё нет.
    """
    if not SYLLABUS_FILE.exists():
        return {"topics": []}
    try:
        with open(SYLLABUS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        topics = data.get("topics")
        if not isinstance(topics, list):
            topics = []
    except Exception:
        topics = []
    return {"topics": topics}


# OpenRouter task endpoints

MAX_RETRIES = 5  # number of attempt

@app.post("/send_message")
async def send_message(request: Request):
    data = await request.json()
    topic = data.get("topic", "")
    difficulty = data.get("difficulty", "Easy")
    prompt = (
        f"Create one Python programming task on '{topic}' with '{difficulty}' difficulty.\n"
        "Respond with a JSON object exactly like:\n"
        "{\n"
        "  \"Task name\": string,\n"
        "  \"Task description\": string,\n"
        "  \"Sample input cases\": [ {\"input\": \"<in>\", \"expected_output\": \"<out>\"} ]\n"
        "}\n"
        "Only output the JSON."
    )

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = call_openrouter(prompt)
            task_str = result["choices"][0]["message"]["content"].strip()
            parsed = json.loads(task_str)
            return JSONResponse({"task": json.dumps(parsed, ensure_ascii=False)})
        except JSONDecodeError as e:
            last_error = e
            print(f"[send_message] JSONDecodeError (attempt {attempt}/{MAX_RETRIES}): {e}")
            print("Waiting for valid JSON response, retrying...")
            continue
        except requests.exceptions.HTTPError as http_err:
            status = http_err.response.status_code
            if status == 401:
                raise HTTPException(401, "Invalid API Key")
            return JSONResponse({"error": str(http_err)}, status_code=500)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

    return JSONResponse(
        {"error": f"Failed to get valid JSON after {MAX_RETRIES} attempts: {last_error}"},
        status_code=500
    )

@app.get("/generate_task")
async def generate_task_alias(topic: str, difficulty: str):
    prompt = (
        f"Create one Python programming task on '{topic}' with '{difficulty}' difficulty.\n"
        "Respond ONLY with valid JSON (no markdown, no explanations).\n"
        "Do NOT use Python tuples like ('a', 1). Use JSON arrays like [\"a\", 1].\n"
        "**Use double quotes for all strings (not single quotes).**\n"
        "The structure must be:\n"
        "{\n"
        "  \"Task name\": string,\n"
        "  \"Task description\": string,\n"
        "  \"Sample input cases\": [ {\"input\": \"<in>\", \"expected_output\": \"<out>\"} ]\n"
        "}"
    )

    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = call_openrouter(prompt)
            task_str = result["choices"][0]["message"]["content"].strip()
            json.loads(task_str)
            return JSONResponse({"task": task_str})
        except JSONDecodeError as e:
            last_error = e
            print(f"[generate_task] JSONDecodeError (attempt {attempt}/{MAX_RETRIES}): {e}")
            print("Waiting for valid JSON response, retrying...")
            continue
        except requests.exceptions.HTTPError as http_err:
            status = http_err.response.status_code
            if status == 401:
                raise HTTPException(401, "Invalid API Key")
            return JSONResponse({"error": str(http_err)}, status_code=500)
        except Exception as e:
            return JSONResponse({"error": str(e)}, status_code=500)

    return JSONResponse(
        {"error": f"Failed to get valid JSON after {MAX_RETRIES} attempts: {last_error}"},
        status_code=500
    )

@app.post("/submit_code")
async def submit_code_alias(request: Request):
    # прокидываем на evaluate_code
    return await evaluate_code(request)

@app.post("/evaluate_code")
async def evaluate_code(request: Request):
    data = await request.json()
    task = data.get("task", "")
    code = data.get("code", "")
    eval_prompt = (
        f"Task:\n{task}\n\n"
        f"User solution:\n```python\n{code}\n```\n\n"
        "Respond with a JSON object with fields: correct: true/false, feedback: string. Only JSON."
    )
    try:
        result = call_openrouter(eval_prompt)
        evaluation = result["choices"][0]["message"]["content"].strip()
        return JSONResponse({"evaluation": evaluation})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# Static HTML

@app.get("/", response_class=HTMLResponse)
async def root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())
# python -m uvicorn main:app --port 8005
