# StudyBuddy <!-- Logo placeholder below -->

🐍 Python Practice

---

## One‑Sentence Pitch

**StudyBuddy** is a web‑based AI chatbot that ingests your Python‑course syllabus, generates leveled coding challenges, checks solutions, hints when you’re stuck, and keeps you on track with customizable notifications.

---

|                | Link  |
| -------------- | ----- |
| **Live App**   | http://194.31.174.125/ |
| **Demo Video** | *TBA* |

---

## Project Story

Learning to program is equal parts *practice* and *pacing*.  Students often fall behind because they (a) don’t know which exercises match the current topic, or (b) lose momentum between classes.

**StudyBuddy** solves both problems in one place:

1. **Auto‑curated practice** – Upload a course syllabus and the bot proposes relevant tasks for each lecture, from beginner to advanced.
2. **Real‑time checking & hints** – The built‑in evaluator runs submitted code in a sandbox and reports pass/fail, plus incremental hints.
3. **Progress tracker** – Tracks your overall practice progress, such as total number of problems solved.
4. **Smart reminders** – Customizable email notifications nudge students to practice just enough, right on schedule.

Together this forms a lightweight learning‑platform experience without the overhead of a full LMS.

---

## Context

| Role                                                             | Details                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| **Client**                                                       | Naveed Zafar                                         |
| **Target Users**                                                 | University students taking *Programming in Python*   |
| **External Services**                                            | • **DeepSeek** – task & hint generation              |                                                     
|                                                                  | • **PostgreSQL** – persistent user data & progress   |
|                                                                  | • **Email** – outbound reminders                     |

---

## Feature Roadmap

### ✓ MVP v0 – Core Foundation

* [x] Chat interface skeleton
* [x] AI task‑generation logic
* [x] Difficulty level selector
* [x] Code submission & instant eval

### ✓ MVP v1 – Syllabus & Access System

* [x] Syllabus **.txt** upload
* [x] Registration & login
* [x] Admin mode via special password
* [x] Teacher syllabus upload

### ✓ MVP v2 – Enhanced UX

* [x] Email reminders
* [x] Progress tracker dashboard
* [x] “Learning‑platform” niceties (badges, streaks)

### ⏳ Final Version – Demo Day

* [ ] Full QA & edge‑case handling
* [ ] Responsive design audit
* [ ] Load‑test & performance tweaks
* [ ] Live deployment & DNS
* [ ] Public demo video

---

## Quick‑Start for Users

1. **Visit the app** → *http://194.31.174.125/*.
2. **Sign Up / Log In**: email + password.
   *Admin?* Click *“Admin Login”* and enter password.
3. **Students**:

   1. Pick topic.
   2. Choose difficulty (Easy / Medium / Hard)  → receive auto‑generated tasks.
   3. Code in the built‑in editor, hit **Run & Check**.
   4. View result, ask for a *Hint* if needed.
   5. Track your progress bar.
4. **Admins**:

   1. Upload or edit the course syllabus.
---

## Installation & Run (Developers)

> Requires **Python 3.11+** and **Node 18+**.

### Clone & Backend

```bash
git clone https://github.com/<your‑org>/studybuddy.git
cd studybuddy/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Environment vars (edit .env):
#   OPENAI_API_KEY, DATABASE_URL, EMAIL_API_KEY, ADMIN_PASSWD, …
uvicorn app.main:app --reload  # FastAPI
```

### Frontend

```bash
cd ../frontend
npm install
npm run dev  # Vite + React
```

### Docker (all‑in‑one)

```bash
docker compose up --build  # serves at http://localhost:8000
```

---

