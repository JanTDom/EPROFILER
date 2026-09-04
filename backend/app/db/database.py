from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings
from app.db.models import Base

# Utwórz silnik asynchroniczny ze zwiększonym limitem czasu oczekiwania na blokadę (60s)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENV == "development"),
    future=True,
    connect_args={"timeout": 60}
)

@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Konfiguruje SQLite: busy_timeout i synchronous dla odporności na współbieżność."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA busy_timeout=60000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
        except Exception:
            pass
    finally:
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency do wstrzykiwania sesji bazy danych w endpointach FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            if session.dirty or session.new or session.deleted:
                await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db() -> None:
    """Inicjalizacja tabel w bazie danych."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
