import json
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_save_and_get_syllabus(tmp_path, monkeypatch):
    # Redirect syllabus.json to a temporary path to avoid affecting real data
    test_syllabus_path = tmp_path / "syllabus.json"
    monkeypatch.setattr("main.SYLLABUS_FILE", test_syllabus_path)

    # Data to test
    syllabus_data = {"topics": ["binary search", "dynamic programming"]}

    # Save syllabus
    response = client.post("/save_syllabus", json=syllabus_data)
    assert response.status_code == 200
    assert response.json() == {"message": "Syllabus saved"}

    # Get syllabus
    response = client.get("/get_syllabus")
    assert response.status_code == 200
    assert response.json() == syllabus_data

