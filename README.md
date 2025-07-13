# StudyBuddy 🐍

**StudyBuddy** is a web‑based AI chatbot that ingests your Python‑course syllabus, generates leveled coding challenges, checks solutions, hints when you’re stuck, and keeps you on track with customizable notifications.

---

|                | Link  |
| -------------- | ----- |
| **Live App**   | http://194.31.174.125/ |
| **Demo Video** | https://disk.yandex.ru/i/kHkq3orwnzELYw |

---

## Project Story

Learning to program is equal parts *practice* and *pacing*.  Students often fall behind because they (a) don’t know which exercises match the current topic, or (b) not enough practice.

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
|                                                                  | • **SQLite** – persistent user data & progress   |
|                                                                  | • **Email** – outbound reminders                     |

---

## Feature Roadmap

### ✓ MVP v0 – Core Foundation

* [x] Chat interface skeleton
* [x] AI task‑generation logic
* [x] Difficulty level selector
* [x] Code submission & instant eval

### ✓ MVP v1 – Syllabus & Access System

* [x] Syllabus **.txt** and **.pdf** upload
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
## Documentation
### [Changelog](https://github.com/Team15SWP/studdybuddy/blob/main/CHANGELOG.md)
### [Development](https://github.com/Team15SWP/studdybuddy/blob/main/CONTRIBUTING.md) 
### [Quality attribute scenarios](https://github.com/Team15SWP/studdybuddy/blob/main/docs/quality-attributes/quality-attribute-scenarios.md)
### Quality assurance
- [Automated tests](https://github.com/Team15SWP/studdybuddy/blob/main/docs/quality-assurance/automated-tests.md)
- [User acceptance tests](https://github.com/Team15SWP/studdybuddy/blob/main/docs/quality-assurance/user-acceptance-tests.md)
### Build and deployment automation
- [Continuous Integration](https://github.com/Team15SWP/studdybuddy/blob/main/docs/automation/continuous-integration.md)
- [Continuous Deployment](https://github.com/Team15SWP/studdybuddy/blob/main/docs/automation/continuous-delivery.md)
### Architecture
- [Static view](https://github.com/Team15SWP/studdybuddy/blob/main/docs/architecture/static-view.md) 
- [Dynamic view](https://github.com/Team15SWP/studdybuddy/blob/main/docs/architecture/dynamic-view.md)
- [Deployment view](https://github.com/Team15SWP/studdybuddy/blob/main/docs/architecture/deployment-view.md)
- [Tech Stack](https://github.com/Team15SWP/studdybuddy/blob/main/docs/architecture/architecture.md)
## Installation & Run (Developers)

> Requires **Python 3.11+**.

### Local Setup
```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/studybuddy.git
cd studybuddy

# 2. Create & activate a virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

# 3. Install Python dependencies
pip install requirements.txt

# 4. Set environment variables (in a .env file):
# OPENROUTER_API_KEY=your_openrouter_key
# ADMIN_PASSWD=your_admin_password
# DATABASE_URL=postgresql://user:pass@localhost/dbname
# EMAIL_API_KEY=your_email_service_key

# 5. Run the backend server
uvicorn main:app --reload --port 8005
```
### Docker Compose
```
# Build and start services (FastAPI + Nginx)
docker compose up --build
```
---
## Licence 
See [LICENSE.txt](https://github.com/Team15SWP/studdybuddy/blob/main/LICENSE) for information.
