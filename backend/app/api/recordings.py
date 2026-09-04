from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Recording
from app.services.storage import storage_service
from app.workers.queue import task_queue
from app.workers.tasks import run_pipeline_step_by_step

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

class RecordingResponse(BaseModel):
    id: str
    tytul: str
    zrodlo_typ: str
    zrodlo_url: Optional[str] = None
    data_publikacji: Optional[datetime] = None
    czas_trwania_sek: float
    typ_nagrania: str
    status_przetwarzania: str
    krok_postepu: str
    procent_postepu: int
    blad: Optional[str] = None
    tryb_biometryczny: bool = True
    zakres_analizy: str = "pelny" # "pelny" (wszystko) | "behawioralny" (tylko zachowanie i stan psychiczny)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CreateFromUrlRequest(BaseModel):
    url: str
    tytul: Optional[str] = None
    typ_nagrania: str = "wywiad" # "wywiad", "debata", "przemowienie"
    data_publikacji: Optional[datetime] = None
    tryb_biometryczny: bool = True
    zakres_analizy: str = "pelny" # "pelny" | "behawioralny"

@router.get("", response_model=List[RecordingResponse])
async def list_recordings(db: AsyncSession = Depends(get_db)):
    stmt = select(Recording).order_by(desc(Recording.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Recording).where(Recording.id == recording_id)
    result = await db.execute(stmt)
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Nagranie nie zostało znalezione.")
    return rec

@router.post("/url", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def create_recording_from_url(payload: CreateFromUrlRequest, db: AsyncSession = Depends(get_db)):
    title = payload.tytul.strip() if payload.tytul else f"Nagranie z URL ({payload.url[:40]}...)"
    
    rec = Recording(
        zrodlo_typ="url",
        zrodlo_url=payload.url,
        tytul=title,
        data_publikacji=payload.data_publikacji,
        typ_nagrania=payload.typ_nagrania,
        tryb_biometryczny=payload.tryb_biometryczny,
        zakres_analizy=payload.zakres_analizy,
        status_przetwarzania="POBIERANIE",
        krok_postepu="Zadanie zakolejkowane do pobrania..."
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    # Kolejkuj przetwarzanie
    task_queue.enqueue(run_pipeline_step_by_step, rec.id)
    return rec

@router.post("/upload", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def upload_recording_file(
    file: UploadFile = File(...),
    tytul: Optional[str] = Form(None),
    typ_nagrania: str = Form("wywiad"),
    data_publikacji: Optional[str] = Form(None),
    tryb_biometryczny: bool = Form(True),
    zakres_analizy: str = Form("pelny"),
    db: AsyncSession = Depends(get_db)
):
    title = tytul.strip() if tytul else file.filename
    pub_date = None
    if data_publikacji:
        try:
            pub_date = datetime.fromisoformat(data_publikacji)
        except ValueError:
            pass

    rec = Recording(
        zrodlo_typ="plik",
        tytul=title,
        data_publikacji=pub_date,
        typ_nagrania=typ_nagrania,
        tryb_biometryczny=tryb_biometryczny,
        zakres_analizy=zakres_analizy,
        status_przetwarzania="PRZETWARZANIE",
        krok_postepu="Zapisano plik. Uruchamianie przetwarzania..."
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)

    # Zapisz plik na dysku
    saved_path = storage_service.save_upload_file(rec.id, file.filename, file.file)
    rec.sciezka_wideo = str(saved_path)
    await db.commit()

    # Uruchom potok
    task_queue.enqueue(run_pipeline_step_by_step, rec.id)
    return rec

@router.delete("/{recording_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Recording).where(Recording.id == recording_id)
    result = await db.execute(stmt)
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Nagranie nie zostało znalezione.")
    
    await db.delete(rec)
    await db.commit()
    return None
