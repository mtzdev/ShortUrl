import asyncio
from datetime import datetime
import threading
import httpx
from loguru import logger
from src.settings import WEBHOOK_INFO, WEBHOOK_ERROR

def send_webhook(message: str, webhook_url: str):
    def runner():
        async def task():
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(webhook_url, json={"content": message})
            except Exception as e:
                logger.warning(f"[Log Error]: {e}")

        asyncio.run(task())

    threading.Thread(target=runner, daemon=True).start()

def info_sink(message):
    send_webhook(f"**[{message.record['level'].name}]** {message.record['message']}\n-# **{datetime.now().strftime('%d/%m/%Y - %H:%M:%S')}**", WEBHOOK_INFO)

def error_sink(message):
    send_webhook(f"**[{message.record['level'].name}]** {message.record['message']}\n-# **{datetime.now().strftime('%d/%m/%Y - %H:%M:%S')}**", WEBHOOK_ERROR)

def setup_discord_logging():
    logger.remove()
    logger.add(info_sink, level="INFO", filter=lambda r: r["level"].name in ("INFO", "WARNING"))
    logger.add(error_sink, level="ERROR", filter=lambda r: r["level"].name in ("ERROR", "CRITICAL"))