import unittest
import sqlite3
import os
import bcrypt
import uuid
from database import register_user, init_db

TEST_DB = "test_users.db"

class TestRegisterUser(unittest.TestCase):

    def setUp(self):
        # Patch sqlite3.connect to use a test DB file
        self._original_connect = sqlite3.connect
        sqlite3.connect = lambda _: self._original_connect(TEST_DB)
        init_db()

    def tearDown(self):
        # Restore original connect
        sqlite3.connect = self._original_connect

    def test_register_user_success(self):
        email = f"user_{uuid.uuid4()}@innopolis.university"
        login = f"user_{uuid.uuid4().hex[:6]}"
        password = "mypassword"

        register_user(email, login, password)

        conn = sqlite3.connect(TEST_DB)
        cur = conn.cursor()
        cur.execute("SELECT email, login, password_hash FROM users WHERE email = ?", (email.lower(),))
        row = cur.fetchone()
        conn.close()

        self.assertIsNotNone(row)
        self.assertEqual(row[0], email.lower())
        self.assertEqual(row[1], login.lower())
        self.assertTrue(bcrypt.checkpw(password.encode(), row[2].encode()))


if __name__ == "__main__":
    unittest.main()
