import os
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@pytest.mark.skipif(
    "OPENROUTER_API_KEY" not in os.environ,
    reason="Requires OPENROUTER_API_KEY to be set"
)
def test_evaluate_code_real_integration():
    # Simple test case
    task = """
    {
      "Task name": "Sum two numbers",
      "Task description": "Write a program that reads two numbers and prints their sum.",
      "Sample input cases": [ { "input": "2 3", "expected_output": "5" } ]
    }
    """

    code = """
a, b = map(int, input().split())
print(a + b)
""".strip()

    response = client.post("/evaluate_code", json={"task": task, "code": code})

    assert response.status_code == 200
    result = response.json()

    assert "correct" in result
    assert "feedback" in result
    assert isinstance(result["correct"], bool)
