**CONTRIBUTING.md**

This file outlines instructions for installing, running, testing, and contributing to the project.

---

# 1. Project Overview

A brief description: This repository contains a FastAPI backend and a static frontend. The project includes CI/CD pipelines for automated builds, testing, and deployment.

# 2. Repository Structure

```
.github/workflows/       # GitHub Actions CI/CD configuration
ci.yml                  # main workflow (build, tests, deploy)
CHANGELOG.md            # project changelog
Dockerfile.backend      # Dockerfile for backend image
Dockerfile.nginx        # Dockerfile for Nginx image
docker-compose.yml      # local multi-container setup
nginx.conf              # Nginx configuration
main.py                 # FastAPI application entry point
database.py             # database initialization script
requirements.txt        # Python dependencies
static/                 # frontend static files (HTML, JS, CSS)
tests/                  # test suites
  ├─ unit_tests/        # unit tests
  └─ integration/       # integration tests
```

# 3. Prerequisites

Before you begin, install the following:

* **Git** version 2.0 or higher
* **Docker** and **Docker Compose**
* **Python** 3.10+
* **Node.js** and **npm** (if you plan to build or serve the frontend separately)

# 4. Local Setup and Run

## A. Using Docker Compose

1. Clone the repository and navigate to its folder:

   ```bash
   git clone https://github.com/<org>/<repo>.git
   cd <repo>
   ```
2. Start all services:

   ```bash
   docker-compose up --build
   ```
3. Services will be available at:

   * Backend: `http://localhost:8000`
   * Frontend: `http://localhost`

## B. Manual Setup

1. (Optional) Create and activate a Python virtual environment:

   ```bash
   python3 -m venv venv
   source venv/bin/activate   # macOS/Linux
   venv\\Scripts\\activate  # Windows
   ```
2. Install backend dependencies:

   ```bash
   pip install -r requirements.txt
   ```
3. Run the FastAPI server:

   ```bash
   uvicorn main:app --reload --port 8000
   ```
4. Serve static frontend files (e.g., using `serve`):

   ```bash
   npm install -g serve
   serve -s static -l 80
   ```
5. Open your browser at `http://localhost:80` to view the frontend.

# 5. Testing

Local testing uses pytest. To run tests:

```bash
pytest tests/unit_tests
pytest tests/integration
```

All tests are also executed automatically in CI.

# 6. CI/CD (GitHub Actions)

Workflow file: `.github/workflows/ci.yml` includes steps:

1. Checkout code
2. Set up Python and install dependencies
3. Build Docker images (backend and Nginx)
4. Run test suites with pytest
5. (Optional) Publish Docker images or deploy on tag/release

Pull Requests trigger the CI workflow, ensuring code quality.

# 7. Code Style and Formatting

* **Python:** PEP8 compliance, formatted with Black, linted with Flake8
* **JavaScript:** Enforced by ESLint and Prettier

# 8. Contribution Process

1. Create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Implement your changes and add tests.
3. Ensure all tests pass locally.
4. Commit your work:

   ```bash
   git commit -m "feat: short description of your changes"
   ```
5. Push the branch and open a Pull Request. In the PR description, include:

   * Purpose of changes
   * Screenshots or logs if applicable

# 9. Reporting Issues

If you find a bug:

1. Search existing issues to avoid duplicates.
2. Open a new issue and fill in the template:

   * **Description:** What went wrong?
   * **Reproduction Steps:** How to reproduce
   * **Expected vs. Actual Behavior**
   * **Environment:** OS, Python version, Docker version

# 10. License

This project is licensed under the [MIT License](LICENSE).

