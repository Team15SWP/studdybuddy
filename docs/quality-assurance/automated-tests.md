# Automated Tests

## Frameworks

* **pytest**: Python testing framework
* **pytest-cov**: coverage measurement plugin
* **unittest**: built-in unit testing (optional)
* **FastAPI TestClient**: testing HTTP endpoints

## Local Execution

Install dependencies and run:

```bash
pip install pytest pytest-cov
pytest --cov=.
```

## CI Integration

In CI pipeline (e.g., GitHub Actions), we include a step that installs the testing dependencies and runs the pytest command on every push or pull request to the main branch, ensuring tests and coverage checks pass before merging.
