import asyncio
import logging
from typing import Callable, Any
from app.config import settings

logger = logging.getLogger("dyskurs.queue")

class TaskQueue:
    def __init__(self):
        self.redis_available = False
        self.rq_queue = None
        
        try:
            from redis import Redis
            from rq import Queue
            redis_conn = Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
            redis_conn.ping()
            self.rq_queue = Queue("dyskurs-tasks", connection=redis_conn)
            self.redis_available = True
            logger.info("Połączono z kolejką Redis.")
        except Exception as e:
            logger.warning(f"Brak połączenia z Redis ({e}). Aktywowano wewnętrzny asynchroniczny dispatcher zadań w tle.")

    def enqueue(self, func: Callable, *args, **kwargs) -> None:
        """Kolejkuje zadanie w Redis lub uruchamia jako zadanie w pętli asyncio."""
        if self.redis_available and self.rq_queue:
            self.rq_queue.enqueue(func, *args, **kwargs)
        else:
            # Fallback dla środowiska bez aktywnego kontenera Redis
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(func(*args, **kwargs))
            except RuntimeError:
                asyncio.run(func(*args, **kwargs))

task_queue = TaskQueue()
