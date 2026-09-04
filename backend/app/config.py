import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PROFILER"
    ENV: str = "development"
    
    # Baza danych: Domyślnie aiosqlite, jeśli brak zewnętrznego Postgresa
    DATABASE_URL: str = "sqlite+aiosqlite:///./profiler.db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: str = str(BASE_DIR / "storage" / "media")
    CACHE_DIR: str = str(BASE_DIR / "storage" / "cache")
    
    # API Keys
    GEMINI_API_KEY: str = ""
    HF_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Upewnij się, że katalogi storage istnieją
Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.CACHE_DIR).mkdir(parents=True, exist_ok=True)
