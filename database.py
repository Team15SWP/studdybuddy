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
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_settings (
                user_id INTEGER PRIMARY KEY,
                enabled BOOLEAN DEFAULT 1,
                notification_time TEXT DEFAULT '09:00',
                notification_days TEXT DEFAULT '1,2,3,4,5',
                last_notification_date TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
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

def get_notification_settings(user_id: int):
    """Get notification settings for a user."""
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT enabled, notification_time, notification_days
            FROM notification_settings
            WHERE user_id = ?
        """, (user_id,))
        result = cursor.fetchone()
        
        if result:
            enabled, time, days = result
            return {
                "enabled": bool(enabled),
                "notification_time": time,
                "notification_days": days.split(",") if days else []
            }
        else:
            # Return default settings if none exist
            return {
                "enabled": True,
                "notification_time": "09:00",
                "notification_days": ["1", "2", "3", "4", "5"]
            }

def update_notification_settings(user_id: int, enabled: bool, notification_time: str, notification_days: list):
    """Update notification settings for a user."""
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        days_str = ",".join(map(str, notification_days))
        
        cursor.execute("""
            INSERT OR REPLACE INTO notification_settings 
            (user_id, enabled, notification_time, notification_days)
            VALUES (?, ?, ?, ?)
        """, (user_id, enabled, notification_time, days_str))
        conn.commit()

def get_users_with_notifications_enabled():
    """Get all users who have notifications enabled and should receive them now."""
    from datetime import datetime, timedelta
    
    now = datetime.now()
    current_time = now.strftime("%H:%M")
    current_day = str(now.weekday() + 1)  # Monday=1, Sunday=7
    
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.user_id, u.email, u.login, ns.notification_time, ns.notification_days
            FROM users u
            JOIN notification_settings ns ON u.user_id = ns.user_id
            WHERE ns.enabled = 1
        """)
        
        users = []
        for row in cursor.fetchall():
            user_id, email, login, notification_time, notification_days = row
            days = notification_days.split(",") if notification_days else []
            
            # Check if user should receive notification now
            if (current_time == notification_time and 
                current_day in days and
                (now - timedelta(days=1)).strftime("%Y-%m-%d") > get_last_notification_date(user_id)):
                users.append((user_id, email, login))
        
        return users

def get_last_notification_date(user_id: int):
    """Get the last notification date for a user."""
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT last_notification_date
            FROM notification_settings
            WHERE user_id = ?
        """, (user_id,))
        result = cursor.fetchone()
        return result[0] if result and result[0] else "1970-01-01"

def update_last_notification_date(user_id: int):
    """Update the last notification date for a user."""
    with sqlite3.connect("users.db") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE notification_settings
            SET last_notification_date = ?
            WHERE user_id = ?
        """, (datetime.now().strftime("%Y-%m-%d"), user_id))
        conn.commit()
