# Static View – Layered and Modular Architecture

## System Layers

### 1. Presentation Layer (Frontend)
- The web interface for user interaction with the chatbot.
- Sends requests to the API and displays responses and coding practice tasks.

### 2. API Layer (Backend)
- Handles requests from the frontend.
- Performs user authentication, request routing, and coordinates communication with internal modules.

### 3. Application Logic Layer
- Integrates with the OpenAI API or DeepSeek.
- Responsible for task generation, notification scheduling, and chat history management.

### 4. Data Layer (Database)
- Stores users, message history, notification schedules, logs, and other persistent data.

## Components

- Frontend (HTML/CSS/JavaScript)
- Backend (FastAPI)
- Auth Module
- Notification System
- LLM Integration Module
- AI Logic
- History Manager
- Database (SQLite)
- CI/CD and Deployment

## Diagram
![static-view.png](https://img.plantuml.biz/plantuml/png/ZLLDZzem4BtxLupsKZYWjDTLLPL2Lui4BILezx2x1vDCWeLZf_QaDAhwtpiEWKrPs8K3iZrlthpviFFPatHK5LgG8eqGaoILm9t2xJMCrf9Mbc3eahKYJAXo29brC7SsTx8ebCbvBHDsGI7yHfbIyZaajYYjGKCnrKpgs5MQN6C7ujSojTj0GAxg6hGoI7M9K5fTXqt7vcnbqf5r1XryUDynf9Z9IjCIVzDGgzmK71iI_aFNGPKosSWSbo7JPvZ6Z8HunucWvptdRmrCPSskhGDSlRHTmHy1_7kuSPR3cFJHtECA9Y5a9XDy4dy3wN0-EUOw71qelh296GBuqVHkf2TUzPzsnc55QvZPjD87phBKAccrs9pRTHpXDE0GRpgTDKAvXm73CR-NQ8OJY62CMCQ8cqFqoOwXtNwpfB8zTLnxmgArt2fFrjKmauOrk5RgM98yLlTyjXUKyibAUeI7SRjYIV6FASySIvfRJxb3tlTRrf4jYihiPKZdxDQBius0mU3JsHh3DTmkb_CO5lYpGa_GMtoDbtrn5j-GTNl237VeL5O3MVPWmGlCkHWyeb5JEoF-npSCRoNAh0kKQRHrmLPvPWjL4cy9sxUhyTzbHD9l84U-CqszH0VK-5mq3Smtabf307CySQ7N2L7yY9X6KvJOb5-DOpd7WyHEiVo5-mmmRPp5IzobTRrlIhhUkRzLq5C37nGbQmpTXB9z_S1qWEAqswK2OnQ6aUFsWs_ZUF7AV7yS35wRxxRa_8BncyoNhDSCH0G5UXykP0Jy3Q3AzyK_)
