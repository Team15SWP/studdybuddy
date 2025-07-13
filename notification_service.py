"""
Notification Service for Study Buddy

This service sends notifications to inactive users to encourage them to return to the platform.
Equivalent to the Go notification service but implemented in Python.
"""

import asyncio
import logging
import os
import signal
import sys
from datetime import datetime, timedelta
from typing import List, Optional

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

from database import get_users_with_notifications_enabled, update_last_notification_date, init_db

# Load environment variables
load_dotenv()

# Environment constants
ENV_LOCAL = "local"
ENV_DEV = "dev"
ENV_PROD = "prod"

# Configuration
class Config:
    def __init__(self):
        self.env = os.getenv("ENV", ENV_LOCAL)
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@studdybuddy.com")
        self.app_name = os.getenv("APP_NAME", "Study Buddy")

def setup_logger(env: str) -> logging.Logger:
    """Setup logger based on environment."""
    logger = logging.getLogger("notification_service")
    
    if env == ENV_LOCAL:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '[%(levelname)s] %(asctime)s - %(name)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
    elif env == ENV_DEV:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '{"level": "%(levelname)s", "time": "%(asctime)s", "message": "%(message)s"}'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
    elif env == ENV_PROD:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '{"level": "%(levelname)s", "time": "%(asctime)s", "message": "%(message)s"}'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    
    return logger

class NotificationRepository:
    """Repository for notification-related database operations."""
    
    def __init__(self):
        # Initialize database connection
        init_db()
    
    def get_users_to_notify(self) -> List[tuple]:
        """Get users who should receive notifications based on their settings."""
        return get_users_with_notifications_enabled()

class NotificationService:
    """Service for sending notifications to users."""
    
    def __init__(self, repository: NotificationRepository, logger: logging.Logger, config: Config):
        self.repository = repository
        self.logger = logger
        self.config = config
    
    def _create_email_message(self, to_email: str, username: str) -> MIMEMultipart:
        """Create email message for inactive user."""
        msg = MIMEMultipart()
        msg['From'] = self.config.from_email
        msg['To'] = to_email
        msg['Subject'] = f"Come back to {self.config.app_name}! 🚀"
        
        body = f"""
        Hi {username}! 👋
        
        We noticed you haven't been active on {self.config.app_name} for a while.
        Don't let your coding skills get rusty! 🧠
        
        Come back and:
        • Practice with new coding challenges
        • Improve your problem-solving skills
        • Track your progress
        
        Ready to code? Visit our platform now!
        
        Best regards,
        The {self.config.app_name} Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        return msg
    
    def _send_email(self, to_email: str, username: str) -> bool:
        """Send email notification to user."""
        try:
            if not all([self.config.smtp_username, self.config.smtp_password]):
                self.logger.warning("SMTP credentials not configured, skipping email send")
                return False
            
            msg = self._create_email_message(to_email, username)
            
            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
                server.starttls()
                server.login(self.config.smtp_username, self.config.smtp_password)
                server.send_message(msg)
            
            self.logger.info(f"Notification sent to {to_email}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def notify_users(self) -> None:
        """Send notifications to users based on their settings."""
        try:
            users_to_notify = self.repository.get_users_to_notify()
            
            if not users_to_notify:
                self.logger.info("No users to notify at this time")
                return
            
            self.logger.info(f"Found {len(users_to_notify)} users to notify")
            
            success_count = 0
            for user_id, email, username in users_to_notify:
                if self._send_email(email, username):
                    # Update last notification date
                    update_last_notification_date(user_id)
                    success_count += 1
            
            self.logger.info(f"Successfully sent {success_count}/{len(users_to_notify)} notifications")
            
        except Exception as e:
            self.logger.error(f"Error in notify_users: {e}")
            raise

async def main():
    """Main function to run the notification service."""
    # Setup signal handling
    loop = asyncio.get_event_loop()
    
    def signal_handler():
        loop.stop()
    
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)
    
    # Load configuration
    config = Config()
    
    # Setup logger
    logger = setup_logger(config.env)
    
    logger.info("starting notification service", extra={"env": config.env})
    logger.debug("debug messages are enabled")
    
    try:
        # Initialize repository and service
        repository = NotificationRepository()
        service = NotificationService(repository, logger, config)
        
        logger.info("notification service initialized successfully")
        
        # Send notifications
        service.notify_users()
        
        logger.info("notification service completed successfully")
        
    except Exception as e:
        logger.error(f"notification service error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down notification service...")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1) 