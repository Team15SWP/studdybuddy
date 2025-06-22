import sqlite3
import bcrypt
from datetime import datetime, timedelta

def init_db():
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                login TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                registration_date TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                last_completed_at TEXT
            )
        """)
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email ON users(LOWER(email));")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_login ON users(LOWER(login));")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS syllabus (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT NOT NULL
            )
        """)
        conn.commit()

def register_user(email, login, password):
    try:
        with sqlite3.connect("users.db") as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cursor.execute("""
                INSERT INTO users (email, login, password_hash, registration_date)
                VALUES (?, ?, ?, ?)
            """, (email.lower(), login.lower(), password_hash, now))
            conn.commit()
    except sqlite3.IntegrityError:
        raise ValueError("Email or login already registered")

def update_score(user_id, points):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    UPDATE users
    SET score = score + ?, last_completed_at = ?
    WHERE user_id = ?
    """, (points, now, user_id))
    conn.commit()
    conn.close()

def get_inactive_users():
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    yesterday = (datetime.now() - timedelta(days=1)).isoformat()
    cursor.execute("""
        SELECT email, user_id, login FROM users
        WHERE last_completed_at IS NULL OR last_completed_at < ?
    """, (yesterday,))
    inactive_users = cursor.fetchall()
    conn.close()
    return inactive_users

def save_syllabus(topics: list):
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM syllabus")
        for topic in topics:
            cursor.execute("INSERT INTO syllabus (topic) VALUES (?)", (topic,))
        conn.commit()

def get_syllabus():
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT topic FROM syllabus")
        return [row[0] for row in cursor.fetchall()]

def get_hint(topic: str, difficulty: str):
    return f"Hint for {topic} ({difficulty}): Consider using a loop or recursion."
