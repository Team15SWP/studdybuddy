# test_extract_json.py
import unittest
import json
from main import extract_json_from_llm

class TestExtractJsonFromLLM(unittest.TestCase):
    def test_valid_json_no_wrapping(self):
        """Test extraction from plain JSON string"""
        text = '{"name": "Alice", "age": 30, "scores": [90, 85, 95]}'
        result = extract_json_from_llm(text)
        self.assertEqual(result, {"name": "Alice", "age": 30, "scores": [90, 85, 95]})
        self.assertIsInstance(result["scores"], list)

    def test_valid_json_with_markdown_fence(self):
        """Test extraction from markdown code block"""
        text = (
            "Here's the JSON:\n"
            "```json\n"
            "{\n"
            "  \"status\": \"success\",\n"
            "  \"data\": {\"id\": 123, \"valid\": true}\n"
            "}\n"
            "```\n"
            "Some additional text"
        )
        result = extract_json_from_llm(text)
        expected = {"status": "success", "data": {"id": 123, "valid": True}}
        self.assertEqual(result, expected)
        self.assertIsInstance(result["data"], dict)

    def test_json_with_extra_content(self):
        """Test extraction when JSON is surrounded by text"""
        text = (
            "Prefix text\n"
            "{\"task\": \"Calculate sum\", \"params\": [1, 2, 3], "
            "\"expected\": 6}\n"
            "Suffix text"
        )
        result = extract_json_from_llm(text)
        expected = {"task": "Calculate sum", "params": [1, 2, 3], "expected": 6}
        self.assertEqual(result, expected)
        self.assertIsInstance(result["params"], list)

    def test_empty_string(self):
        """Test empty input raises ValueError"""
        with self.assertRaises(ValueError) as context:
            extract_json_from_llm("")
        self.assertIn("empty string", str(context.exception).lower())

    def test_no_json_object(self):
        """Test input without JSON raises ValueError"""
        text = "This is just a regular string without any JSON objects"
        with self.assertRaises(ValueError) as context:
            extract_json_from_llm(text)
        self.assertIn("no json object", str(context.exception).lower())

    def test_invalid_json_syntax(self):
        """Test malformed JSON raises JSONDecodeError"""
        text = '{"name": "Bob", "age": 25, "traits": ["kind", "curious"}'
        with self.assertRaises(json.JSONDecodeError):
            extract_json_from_llm(text)

    def test_complex_nested_structure(self):
        """Test extraction of complex nested JSON"""
        text = (
            "```json\n"
            "{\n"
            "  \"assignment\": \"Matrix Multiplication\",\n"
            "  \"difficulty\": \"hard\",\n"
            "  \"test_cases\": [\n"
            "    {\"input\": [[1,2],[3,4]], \"expected\": [[7,10],[15,22]]},\n"
            "    {\"input\": [[5,6],[7,8]], \"expected\": [[67,78],[91,102]]}\n"
            "  ],\n"
            "  \"metadata\": {\"time_limit\": 30, \"memory_limit\": 256}\n"
            "}\n"
            "```"
        )
        result = extract_json_from_llm(text)
        
        # Validate types and structure
        self.assertIsInstance(result, dict)
        self.assertEqual(result["assignment"], "Matrix Multiplication")
        self.assertEqual(result["difficulty"], "hard")
        
        # Validate test cases
        test_cases = result["test_cases"]
        self.assertIsInstance(test_cases, list)
        self.assertEqual(len(test_cases), 2)
        self.assertIsInstance(test_cases[0], dict)
        self.assertEqual(test_cases[0]["input"], [[1,2],[3,4]])
        
        # Validate metadata
        metadata = result["metadata"]
        self.assertIsInstance(metadata, dict)
        self.assertEqual(metadata["time_limit"], 30)

    def test_json_with_different_casing(self):
        """Test case sensitivity in keys"""
        text = '{"FirstName": "John", "lastNAME": "Doe", "aGe": 28}'
        result = extract_json_from_llm(text)
        self.assertEqual(result, {"FirstName": "John", "lastNAME": "Doe", "aGe": 28})

if __name__ == "__main__":
    unittest.main()