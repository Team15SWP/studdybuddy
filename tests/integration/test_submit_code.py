import os
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.mark.skipif(
    "OPENROUTER_API_KEY" not in os.environ,
    reason="Requires OPENROUTER_API_KEY to be set"
)
def test_submit_code_alias():
    task = """
    {
      "Task name": "Multiply two numbers",
      "Task description": "Write a program that reads two numbers and prints their product.",
      "Sample input cases": [ { "input": "3 4", "expected_output": "12" } ]
    }
    """

    code = """
a, b = map(int, input().split())
print(a * b)
""".strip()

    response = client.post("/submit_code", json={"task": task, "code": code})

    assert response.status_code == 200
    result = response.json()
    assert "correct" in result
    assert "feedback" in result
