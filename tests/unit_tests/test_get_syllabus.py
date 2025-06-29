import unittest
import sqlite3
from database import save_syllabus, get_syllabus, init_db

TEST_DB = "test_users.db"

class TestGetSyllabus(unittest.TestCase):

    def setUp(self):
        # Patch sqlite3.connect to always use a test database
        self._original_connect = sqlite3.connect
        sqlite3.connect = lambda _: self._original_connect(TEST_DB)

        # Initialize the schema
        init_db()

    def tearDown(self):
        # Restore original connect method
        sqlite3.connect = self._original_connect


    def test_get_syllabus_returns_saved_topics1(self):
        topics = ["recursion", "greedy", "graphs"]
        save_syllabus(topics)
        result = get_syllabus()
        self.assertEqual(set(result), set(topics))
        self.assertIsInstance(result, list)


    def test_get_syllabus_returns_saved_topics2(self):
        topics = ["File I/O", "trees", "graphs"]
        save_syllabus(topics)
        result = get_syllabus()
        self.assertEqual(set(result), set(topics))
        self.assertIsInstance(result, list)
        

    def test_get_syllabus_returns_saved_topics3(self):
        topics = ["GUI", "stack", "MultiThread programming"]
        save_syllabus(topics)
        result = get_syllabus()
        self.assertEqual(set(result), set(topics))
        self.assertIsInstance(result, list)

if __name__ == "__main__":
    unittest.main()
