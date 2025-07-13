# Notification Service

This is a Python equivalent of the Go notification service for the Study Buddy application. It sends email notifications to inactive users to encourage them to return to the platform.

## Features

- **Inactive User Detection**: Identifies users who haven't completed tasks in the last 24 hours
- **Email Notifications**: Sends personalized email reminders to inactive users
- **Configurable Logging**: Different log levels and formats for different environments
- **Docker Support**: Can be run as a containerized service
- **Signal Handling**: Graceful shutdown on SIGINT/SIGTERM

## Architecture

The service follows a similar structure to the Go version:

```
NotificationService
├── NotificationRepository (database operations)
├── NotificationService (business logic)
└── Config (environment configuration)
```

## Configuration

Set the following environment variables:

```bash
# Environment
ENV=local|dev|prod

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email settings
FROM_EMAIL=noreply@studdybuddy.com
APP_NAME=Study Buddy

# JWT Configuration
JWT_SECRET_KEY=your-secret-key-change-in-production
```

## Running the Service

### Local Development

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables (copy from `env.example`):
   ```bash
   cp env.example .env
   # Edit .env with your SMTP settings
   ```

3. Run the service:
   ```bash
   python notification_service.py
   ```

### Using Docker

1. Build and run with docker-compose:
   ```bash
   docker-compose up notification
   ```

2. Or build and run individually:
   ```bash
   docker build -f Dockerfile.notification -t study-buddy-notification .
   docker run --env-file .env study-buddy-notification
   ```

## Database Integration

The service uses the same SQLite database as the main application (`users.db`) and calls the `get_inactive_users()` function from `database.py` to find users who haven't been active in the last 24 hours.

## Logging

The service supports different logging configurations based on the environment:

- **Local**: Text format with DEBUG level
- **Dev**: JSON format with DEBUG level  
- **Prod**: JSON format with INFO level

## Email Template

The service sends personalized emails with the following template:

```
Hi {username}! 👋

We noticed you haven't been active on Study Buddy for a while.
Don't let your coding skills get rusty! 🧠

Come back and:
• Practice with new coding challenges
• Improve your problem-solving skills
• Track your progress

Ready to code? Visit our platform now!

Best regards,
The Study Buddy Team
```

## Error Handling

- SMTP connection failures are logged but don't stop the service
- Database errors are logged and the service exits with error code 1
- Graceful shutdown on SIGINT/SIGTERM signals

## Differences from Go Version

1. **Async/Await**: Uses Python's asyncio for async operations
2. **SQLite**: Uses SQLite instead of PostgreSQL (matches your current setup)
3. **Email**: Uses Python's smtplib instead of a separate email service
4. **Configuration**: Uses environment variables directly instead of a config struct
5. **Logging**: Uses Python's logging module instead of slog

## Testing

To test the service without sending actual emails:

1. Don't set SMTP credentials - the service will log warnings but continue
2. Check the logs to see which users would receive notifications
3. Use the `run_notification_service.py` script for manual testing

## Deployment

For production deployment:

1. Set `ENV=prod` for production logging
2. Configure proper SMTP credentials
3. Set up a cron job or scheduler to run the service daily
4. Consider using a proper email service (SendGrid, AWS SES, etc.) instead of SMTP

## Monitoring

The service logs:
- Number of inactive users found
- Number of successful email sends
- Any errors during the process

Monitor these logs to ensure the service is working correctly. 