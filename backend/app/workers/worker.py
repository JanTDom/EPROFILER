import os
import asyncio
from redis import Redis
from rq import Worker, Queue
from app.config import settings

def run_worker():
    redis_conn = Redis.from_url(settings.REDIS_URL)
    queue = Queue("dyskurs-tasks", connection=redis_conn)
    worker = Worker([queue], connection=redis_conn)
    print("DYSKURS Worker wystartował. Oczekiwanie na zadania...")
    worker.work()

if __name__ == "__main__":
    run_worker()
