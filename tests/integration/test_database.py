import os
import sqlite3
import tempfile
import pytest
from database import init_db, register_user


@pytest.fixture
def temp_db(monkeypatch):
    # Use a temporary file as the database
    db_fd, db_path = tempfile.mkstemp()
    monkeypatch.setenv("DATABASE_PATH", db_path)

    # Save original connect
    original_connect = sqlite3.connect

    # Patch connect to use the temp DB
    monkeypatch.setattr(sqlite3, "connect", lambda _: original_connect(db_path))

    init_db()
    yield db_path

    os.close(db_fd)
    os.remove(db_path)


def test_register_user(temp_db):
    # Should succeed
    register_user("test@example.com", "testuser", "password123")

    # Verify data
    with sqlite3.connect(temp_db) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT email, login FROM users WHERE email = ?", ("test@example.com",))
        result = cursor.fetchone()
        assert result == ("test@example.com", "testuser")

    # Should raise error on duplicate
    with pytest.raises(ValueError):
        register_user("test@example.com", "testuser", "password123")
