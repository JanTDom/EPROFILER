import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PROFILER"
    ENV: str = "development"
    
    # Ścieżka bazowa projektu
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    # Baza danych: Domyślnie aiosqlite w katalogu głównym projektu
    DATABASE_URL: str = f"sqlite+aiosqlite:///{Path(__file__).resolve().parent.parent.parent / 'profiler.db'}"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Storage
    STORAGE_DIR: str = str(BASE_DIR / "storage" / "media")
    CACHE_DIR: str = str(BASE_DIR / "storage" / "cache")
    
    # API Keys
    GEMINI_API_KEY: str = ""
    HF_TOKEN: str = ""

    model_config = SettingsConfigDict(
        env_file=[
            str(Path(__file__).resolve().parent.parent.parent / ".env"),
            str(Path(__file__).resolve().parent.parent / ".env"),
        ],
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Upewnij się, że katalogi storage istnieją
Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.CACHE_DIR).mkdir(parents=True, exist_ok=True)
