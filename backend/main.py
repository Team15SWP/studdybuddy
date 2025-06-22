import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

# Импорт из database.py
from database import (
    init_db, register_user, update_score, get_inactive_users,
    save_syllabus, get_syllabus, get_hint
)

# === Инициализация ===
load_dotenv()
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

@app.on_event("startup")
def startup():
    init_db()

# === OpenRouter ===
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

# === Роуты ===
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/register")
async def register(email: str = Form(...), login: str = Form(...), password: str = Form(...)):
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
        "Respond with a JSON object with exactly these fields:\n"
        "1. 'Task name': String\n"
        "2. 'Task description': String\n"
        "3. 'Sample input cases': Array of 3 sample inputs (as strings)\n"
        "4. 'Expected outputs for the test cases': Array of 3 corresponding outputs (as strings)\n"
        "5. 'Hints': Array of exactly 3 hint strings\n\n"
        "Example structure:\n"
        "{{\n"
        "  \"Task name\": \"Task Title\",\n"
        "  \"Task description\": \"Description here\",\n"
        "  \"Sample input cases\": [\"input1\"\n \" input2\"\n \" input3\"]\n"
        "  \"Expected outputs for the test cases\": [\"output1 \"\n \" output2\"\n \" output3\"]\n"
        "  \"Hints\": [\"Hint 1\", \"Hint 2\", \"Hint 3\"]\n"
        "}}"
    )
    try:
        result = call_openrouter(prompt)
        task = result['choices'][0]['message']['content'].strip()
          # Clean and parse JSON response
        task_str = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', task_str)
        
        # Remove JSON code block if present
        if task_str.startswith('```json'):
            task_str = task_str[7:-3].strip()
        elif task_str.startswith('```'):
            task_str = task_str[3:-3].strip()
            
        task_obj = json.loads(task_str)
         # Validate structure
        
        return JSONResponse({'task': task_obj})        
          

    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)
    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)


    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 401:
            raise HTTPException(status_code=401, detail='Invalid API Key')
        return JSONResponse({'error': str(http_err)}, status_code=500)
    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)
# POST: Evaluate code
@app.post('/evaluate_code')
async def evaluate_code(request: Request):
    try:
        data = await request.json()
        print("Received data:", data)
        task_description = data.get('task', '')
        user_code = data.get('code', '')

        eval_prompt = (
            f"Task:\n{task_description}\n\n"
            f"User message:\n {user_code}\n"
            "Check if the user message is a code solution or question regarding task\n"
            "If the message is a question - respond with a JSON object with fields: 'question': true, 'feedback': answer for the question. Do not give away solution, only help with understanding task requirements"
            "If the message is a code solution - Analyze the above code for correctness against the task requirements. "
            "Respond with a JSON object with fields: 'question': false 'correct': true or false, 'feedback': a brief explanation (only if correct is false, if true - make a compliment). Do not include additional comments or formatting"
        ) 

        result = call_openrouter(eval_prompt)
        evaluation = result['choices'][0]['message']['content'].strip()
        try:
            # Remove JSON code block if present
            if evaluation.startswith('```json'):
                evaluation = evaluation[7:-3].strip()
            elif evaluation.startswith('```'):
                evaluation = evaluation[3:-3].strip()
                
            evaluation_obj = json.loads(evaluation)
            return JSONResponse({'evaluation': evaluation_obj})
        except json.JSONDecodeError:
            return JSONResponse({'evaluation': {'error': 'Invalid evaluation format', 'raw': evaluation}})

    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)

    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)
