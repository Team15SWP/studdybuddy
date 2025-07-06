# CI: Continuous Integration

**Tool:** GitHub Actions

**Configuration location:**
File .github/workflows/ci.yml

**Key steps:**
1. **Checkout code** — Repository cloning
2. **Setup Python** — Install required Python version
3. **Install dependencies** — pip install -r requirements.txt
4. **Run linter** — Code validation (e.g., flake8 . or pytest --max-line-length=88 --check)
5. **Run tests** — Execute unit and integration tests (pytest --cov=.)
