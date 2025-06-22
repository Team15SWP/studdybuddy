import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from database import (
    init_db, register_user, update_score, get_inactive_users,
    save_syllabus, get_syllabus, get_hint
)

load_dotenv()
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

@app.on_event("startup")
def startup():
    init_db()

API_URL = 'https://openrouter.ai/api/v1/chat/completions'

def get_api_key():
    key = os.getenv('OPENROUTER_API_KEY')
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY not set in .env")
    return key

def call_openrouter(prompt: str, timeout: int = 30) -> dict:
    headers = {
        'Authorization': f"Bearer {get_api_key()}",
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        'messages': [{'role': 'user', 'content': prompt}]
    }
    response = requests.post(API_URL, json=payload, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.json()


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/register")
async def register(email: str = Form(...), login: str = Form(...), password: str = Form(...)):
    print(f"Trying to register user: {email}, {login}")
    try:
        register_user(email, login, password)
        return {"message": "User registered"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/get_syllabus")
async def get_syllabus_route():
    return {"topics": get_syllabus()}

@app.post("/save_syllabus")
async def save_syllabus_route(data: dict):
    topics = data.get("topics", [])
    save_syllabus(topics)
    return {"message": "Syllabus saved"}

@app.get("/get_hint")
async def get_hint_route(topic: str, difficulty: str):
    return {"hint": get_hint(topic, difficulty)}

@app.get("/generate_task")
async def generate_task(topic: str, difficulty: str):
    prompt = (
        f"Create one Python programming task on '{topic}' with '{difficulty}' difficulty. "
        "Respond with only the task description. Include a sample input and expected output."
    )
    try:
        result = call_openrouter(prompt)
        task = result['choices'][0]['message']['content'].strip()
        return {"task": task}
    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        return JSONResponse({"error": str(http_err)}, status_code=500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/evaluate_code")
async def evaluate_code(request: Request):
    try:
        data = await request.json()
        task_description = data.get("task", "")
        user_code = data.get("code", "")
        prompt = (
            f"Task:\n{task_description}\n\n"
            f"User solution:\n```python\n{user_code}\n```\n\n"
            "Analyze the code. Respond with JSON: {'correct': bool, 'feedback': string}"
        )
        result = call_openrouter(prompt)
        evaluation = result['choices'][0]['message']['content'].strip()
        return {"evaluation": evaluation}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
