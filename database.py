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
    if not email.endswith('@innopolis.university'):
        raise ValueError("Only @innopolis.university emails are allowed")

    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long")

    try:
        with sqlite3.connect("users.db") as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT 1 FROM users WHERE LOWER(email) = LOWER(?)", (email,))
            if cursor.fetchone():
                raise ValueError("Email already registered")

            cursor.execute("SELECT 1 FROM users WHERE LOWER(login) = LOWER(?)", (login,))
            if cursor.fetchone():
                raise ValueError("Username already taken")

            now = datetime.now().isoformat()
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            cursor.execute("""
                INSERT INTO users (email, login, password_hash, registration_date)
                VALUES (?, ?, ?, ?)
            """, (email.lower(), login.lower(), password_hash, now))
            conn.commit()
    except sqlite3.IntegrityError as e:
        raise ValueError("User already exists")

def login_user(identifier, password):
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT user_id, email, login, password_hash
            FROM users
            WHERE LOWER(email) = LOWER(?) OR LOWER(login) = LOWER(?)
        """, (identifier, identifier))
        user = cursor.fetchone()

        if not user:
            raise ValueError("User not found")

        user_id, email, login, password_hash = user

        if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            raise ValueError("Incorrect password")

        return {"user_id": user_id, "name": login}

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
