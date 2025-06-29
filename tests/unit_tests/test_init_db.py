import unittest
import sqlite3
import os
from database import init_db

TEST_DB = "test_users.db"

class TestInitDB(unittest.TestCase):

    def setUp(self):
        # Patch sqlite3 to use a test DB
        self._original_connect = sqlite3.connect
        sqlite3.connect = lambda _: self._original_connect(TEST_DB)

        # Initialize the DB schema
        init_db()

    def tearDown(self):
        # Restore original connect method
        sqlite3.connect = self._original_connect

    def test_tables_and_indexes_exist(self):
        conn = sqlite3.connect(TEST_DB)
        cursor = conn.cursor()

        # Check required tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}
        self.assertIn("users", tables)
        self.assertIn("syllabus", tables)

        # Check required indexes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = {row[0] for row in cursor.fetchall()}
        self.assertIn("idx_unique_email", indexes)
        self.assertIn("idx_unique_login", indexes)

        # Optionally check that columns exist
        cursor.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cursor.fetchall()}
        self.assertIn("email", columns)
        self.assertIn("login", columns)
        self.assertIn("password_hash", columns)
        self.assertIn("registration_date", columns)

        conn.close()

if __name__ == "__main__":
    unittest.main()
