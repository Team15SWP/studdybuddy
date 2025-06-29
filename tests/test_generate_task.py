import os
import json
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


@pytest.mark.skipif(
    "OPENROUTER_API_KEY" not in os.environ,
    reason="Requires OPENROUTER_API_KEY to be set"
)
def test_generate_task_real_integration():
    response = client.get("/generate_task", params={"topic": "strings", "difficulty": "easy"})

    assert response.status_code == 200
    data = response.json()
    assert "task" in data

    try:
        task = json.loads(data["task"])
    except json.JSONDecodeError:
        pytest.fail("Returned task is not valid JSON")

    assert "Task name" in task
    assert "Task description" in task
    assert isinstance(task.get("Sample input cases", []), list)
