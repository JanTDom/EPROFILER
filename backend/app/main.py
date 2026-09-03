import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.database import init_db
from app.api.recordings import router as recordings_router
from app.api.progress import router as progress_router
from app.api.media import router as media_router
from app.api.persons import router as persons_router

# Konfiguracja logowania
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("dyskurs")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Inicjalizacja aplikacji DYSKURS...")
    # Inicjalizacja bazy danych
    await init_db()
    logger.info("Baza danych zainicjalizowana pomyślnie.")
    yield
    logger.info("Zamykanie aplikacji DYSKURS.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Aplikacja analityczna do badania dyskursu, unikania odpowiedzi i retoryki wypowiedzi publicznych.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # W produkcji ściślejsze ograniczenie
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rejestracja routerów
app.include_router(recordings_router)
app.include_router(progress_router)
app.include_router(media_router)
app.include_router(persons_router)

@app.get("/health")
async def healthcheck():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "env": settings.ENV
    }

@app.get("/")
async def root_info():
    return {
        "app": "DYSKURS API",
        "description": "System analizy wypowiedzi polityków i dyskursu publicznego",
        "version": "1.0.0",
        "docs": "/docs"
    }
