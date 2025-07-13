#!/usr/bin/env python3
"""
Simple script to run the notification service manually.
Useful for testing and development.
"""

import asyncio
import sys
from notification_service import main

if __name__ == "__main__":
    print("Starting notification service...")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nNotification service stopped by user")
    except Exception as e:
        print(f"Error running notification service: {e}")
        sys.exit(1) 