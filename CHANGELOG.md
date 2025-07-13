# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [MVP2.5]
### Added
- Score counter and progress modal for users to track solved tasks.
- Admin mode: syllabus upload, topic management, and admin login UI.
- Improved error handling and user feedback in chat (e.g., for invalid code, server errors).
- Modal windows for login, registration, and notification settings.

### Changed
- Sidebar and chat UI improvements for better usability.
- Refined topic selection and difficulty switching logic.

---

## [MVP2]
### Added
- Task generation endpoint: automatic coding task creation based on selected topic and difficulty.
- Code evaluation endpoint: backend checks user code and provides feedback.
- Difficulty selection (Beginner, Medium, Hard) for each topic.
- Hint system: up to 3 hints per task, shown after code submission.

### Changed
- Improved chat flow: bot messages, user code display, and sample cases formatting.

---

## [MVP1]
### Added
- User authentication and registration with JWT tokens.
- Syllabus upload (TXT/PDF) and topic extraction for course structure.
- Topic selection sidebar and chat area for each topic.
- Basic chat interface for user-bot interaction.

### Changed
- Login/logout state reflected in UI (profile, bell, score, etc.).
- Local user storage for development mode.

---

## [MVP0]
### Added
- Initial project structure: FastAPI backend, static HTML/CSS/JS frontend.
- Basic project setup, configuration, and static file serving.
- Simple homepage and navigation skeleton.

---
