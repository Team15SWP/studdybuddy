import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

load_dotenv()

app = FastAPI()

# Static and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

# OpenRouter setup
def get_api_key():
    key = os.getenv('OPENROUTER_API_KEY')
    if not key:
        raise RuntimeError('OPENROUTER_API_KEY environment variable not set')
    return key

API_URL = 'https://openrouter.ai/api/v1/chat/completions'

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

# Root - serve index.html
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# POST: Generate task
@app.get('/generate_task')
async def generate_task(topic: str, difficulty: str):
    prompt = (
        f"Create one Python programming task on '{topic}' with '{difficulty}' difficulty. "
        "Respond with only the task description. Include a sample input and expected output to illustrate the task."
    )

    try:
        result = call_openrouter(prompt)
        task = result['choices'][0]['message']['content'].strip()
        return JSONResponse({'task': task})
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
        task_description = data.get('task', '')
        user_code = data.get('code', '')

        eval_prompt = (
            f"Task:\n{task_description}\n\n"
            f"User solution:\n```python\n{user_code}\n```\n\n"
            "Analyze the above code for correctness against the task requirements. "
            "Respond with a JSON object with fields: 'correct': true or false, 'feedback': a brief explanation."
        )

        result = call_openrouter(eval_prompt)
        evaluation = result['choices'][0]['message']['content'].strip()
        return JSONResponse({'evaluation': evaluation})

    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)
