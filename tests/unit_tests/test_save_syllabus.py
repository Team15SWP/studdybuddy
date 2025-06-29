import unittest
import sqlite3
import os
from database import save_syllabus, get_syllabus, init_db

TEST_DB = "test_users.db"

class TestSaveSyllabus(unittest.TestCase):

    def setUp(self):
        # Redirect sqlite3.connect to test DB
        self._original_connect = sqlite3.connect
        sqlite3.connect = lambda _: self._original_connect(TEST_DB)

        init_db()

    def tearDown(self):
        # Restore original connect
        sqlite3.connect = self._original_connect

    def test_save_syllabus_overwrites_existing(self):
        # Initial insert
        initial = ["topic1", "topic2"]
        save_syllabus(initial)
        self.assertEqual(set(get_syllabus()), set(initial))

        # Overwrite with new topics
        updated = ["algorithms", "recursion"]
        save_syllabus(updated)
        self.assertEqual(set(get_syllabus()), set(updated))
        self.assertNotIn("topic1", get_syllabus())

    def test_save_syllabus_overwrites_existing1(self):
        # Initial insert
        initial = ["topic1", "topic2", "topic3", "topic4"]
        save_syllabus(initial)
        self.assertEqual(set(get_syllabus()), set(initial))

        # Overwrite with new topics
        updated = ["algorithms"]
        save_syllabus(updated)
        self.assertEqual(set(get_syllabus()), set(updated))
        self.assertNotIn("topic1", get_syllabus())
    
    def test_save_syllabus_overwrites_existing2(self):
        # Initial insert
        initial = ["topic1"]
        save_syllabus(initial)
        self.assertEqual(set(get_syllabus()), set(initial))

        # Overwrite with new topics
        updated = ["algorithms", "recursion", "Machine Learning"]
        save_syllabus(updated)
        self.assertEqual(set(get_syllabus()), set(updated))
        self.assertNotIn("topic1", get_syllabus())
if __name__ == "__main__":
    unittest.main()
