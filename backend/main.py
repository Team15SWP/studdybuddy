import os
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv
import json, re

import os, json, tempfile, subprocess, re
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


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

# 1) Генерация задачи (для script.js -> postJson('/send_message'))
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
    try:
        result = call_openrouter(prompt)
        task = result["choices"][0]["message"]["content"].strip()
        return JSONResponse({"task": task})
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 401:
            raise HTTPException(401, "Invalid API Key")
        return JSONResponse({"error": str(http_err)}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# в main.py, после @app.post("/send_message") и до @app.post("/submit_code")
@app.get("/generate_task")
async def generate_task_alias(topic: str, difficulty: str):
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
    try:
        result = call_openrouter(prompt)
        task = result["choices"][0]["message"]["content"].strip()
        return JSONResponse({"task": task})
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 401:
            raise HTTPException(401, "Invalid API Key")
        return JSONResponse({"error": str(http_err)}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)



@app.post("/submit_code")
async def submit_code_alias(request: Request):
    # просто прокидываем в ваш evaluate_code
    return await evaluate_code(request)


@app.post("/evaluate_code")
async def evaluate_code(request: Request):
    # 1) Считаем «сырое» тело и логируем
    raw = (await request.body()).decode(errors="replace")
    print(">>> DEBUG raw request body:", raw)

    try:
        data = json.loads(raw)
    except Exception as e:
        print(">>> DEBUG JSON.parse error:", e)
        return JSONResponse({
            "error":   "Bad JSON payload",
            "details": str(e),
            "raw":     raw
        }, status_code=200)

    task_json_str = data.get("task")
    code          = data.get("code")

    if task_json_str is None or code is None:
        return JSONResponse({
            "error":   "Missing field",
            "expected": ["task", "code"],
            "received": list(data.keys())
        }, status_code=200)

    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", task_json_str, re.IGNORECASE)
    if m:
        task_json_str = m.group(1).strip()

    try:
        task = json.loads(task_json_str)
    except Exception as e:
        print(">>> DEBUG task JSON error:", e)
        return JSONResponse({
            "error":   "Invalid task JSON",
            "details": str(e),
            "raw_task": task_json_str
        }, status_code=200)

    tests = task.get("Sample input cases")
    if not isinstance(tests, list) or not tests:
        return JSONResponse({
            "error": "No sample cases",
            "raw_task": task_json_str
        }, status_code=200)

    return JSONResponse({
        "correct":   False,
        "feedback":  "Reached end of debug stub — replace with real runner",
        "num_tests": len(tests)
    }, status_code=200)


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())
