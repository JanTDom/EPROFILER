from datetime import datetime
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Recording, PsychometricProfile
from app.services.storage import storage_service
from app.services.media import MediaService
from app.workers.queue import task_queue
from app.workers.tasks import run_pipeline_step_by_step

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

class PsychometricProfileResponse(BaseModel):
    id: str
    recording_id: str
    otwartosc: Optional[int] = 50
    sumiennosc: Optional[int] = 50
    ekstrawersja: Optional[int] = 50
    ugodowosc: Optional[int] = 50
    neurotyzm: Optional[int] = 50
    nastroj_glowny_prosty: str
    styl_komunikacji_prosty: str
    czule_punkty_i_leki: Optional[List[Any]] = []
    mocne_strony: Optional[List[Any]] = []
    glowne_uniki_i_taktyka: Optional[str] = None
    spojnosc_mowy_ze_slowami: Optional[str] = None
    skutecznosc_argumentacji: Optional[str] = None
    perswazyjnosc_odbiorcow: Optional[str] = None
    radzenie_z_adwersarzami: Optional[str] = None
    surowe_wnioski_ai: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

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
    profile_id: Optional[str] = "profile_main"
    polityk_docelowy: Optional[str] = None
    rola_polityka: Optional[str] = "Badany polityk"
    relacja_polityka: Optional[str] = "sojusznik" # "sojusznik" | "przeciwnik"
    speaker_docelowy_tag: Optional[str] = None
    rozpoznani_mowcy: Optional[List[dict]] = None
    psychometric_profile: Optional[PsychometricProfileResponse] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CreateFromUrlRequest(BaseModel):
    url: str
    tytul: Optional[str] = None
    typ_nagrania: str = "wywiad" # "wywiad", "debata", "przemowienie"
    data_publikacji: Optional[datetime] = None
    tryb_biometryczny: bool = True
    zakres_analizy: str = "pelny" # "pelny" | "behawioralny"
    profile_id: Optional[str] = "profile_main"
    polityk_docelowy: Optional[str] = None
    rola_polityka: Optional[str] = "Badany polityk"
    relacja_polityka: Optional[str] = "sojusznik" # "sojusznik" | "przeciwnik"

class SetTargetSpeakerRequest(BaseModel):
    speaker_tag: str
    imie_nazwisko: Optional[str] = None
    rola: Optional[str] = None
    relacja: Optional[str] = None # "sojusznik" | "przeciwnik"

@router.get("", response_model=List[RecordingResponse])
async def list_recordings(
    profile_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Recording).options(selectinload(Recording.psychometric_profile))
    if profile_id:
        stmt = stmt.where(Recording.profile_id == profile_id)
    stmt = stmt.order_by(desc(Recording.created_at))
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(recording_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Recording).options(selectinload(Recording.psychometric_profile)).where(Recording.id == recording_id)
    result = await db.execute(stmt)
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Nagranie nie zostało znalezione.")
    return rec

@router.post("/url", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def create_recording_from_url(payload: CreateFromUrlRequest, db: AsyncSession = Depends(get_db)):
    clean_url = MediaService.sanitize_video_url(payload.url)
    title = payload.tytul.strip() if payload.tytul else f"Nagranie z URL ({clean_url[:40]}...)"
    
    rec = Recording(
        zrodlo_typ="url",
        zrodlo_url=clean_url,
        tytul=title,
        data_publikacji=payload.data_publikacji,
        typ_nagrania=payload.typ_nagrania,
        tryb_biometryczny=payload.tryb_biometryczny,
        zakres_analizy=payload.zakres_analizy,
        profile_id=payload.profile_id or "profile_main",
        polityk_docelowy=payload.polityk_docelowy.strip() if payload.polityk_docelowy else None,
        rola_polityka=payload.rola_polityka.strip() if payload.rola_polityka else "Badany polityk",
        relacja_polityka=payload.relacja_polityka.strip() if payload.relacja_polityka else "sojusznik",
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
    profile_id: Optional[str] = Form("profile_main"),
    polityk_docelowy: Optional[str] = Form(None),
    rola_polityka: Optional[str] = Form("Badany polityk"),
    relacja_polityka: Optional[str] = Form("sojusznik"),
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
        profile_id=profile_id or "profile_main",
        polityk_docelowy=polityk_docelowy.strip() if polityk_docelowy else None,
        rola_polityka=rola_polityka.strip() if rola_polityka else "Badany polityk",
        relacja_polityka=relacja_polityka.strip() if relacja_polityka else "sojusznik",
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

@router.patch("/{recording_id}/target-speaker", response_model=RecordingResponse)
async def set_target_speaker(
    recording_id: str,
    payload: SetTargetSpeakerRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Pozwala zdefiniować lub zmienić cel profilowania (który mówca jest badanym politykiem oraz relację).
    """
    stmt = select(Recording).options(selectinload(Recording.psychometric_profile)).where(Recording.id == recording_id)
    result = await db.execute(stmt)
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Nagranie nie zostało znalezione.")

    rec.speaker_docelowy_tag = payload.speaker_tag
    if payload.imie_nazwisko:
        rec.polityk_docelowy = payload.imie_nazwisko
    if payload.rola:
        rec.rola_polityka = payload.rola
    if payload.relacja:
        rec.relacja_polityka = payload.relacja

    # Zaktualizuj flagę is_target / jest_celem na liście rozpoznanych mówców
    if rec.rozpoznani_mowcy:
        updated_mowcy = []
        for m in rec.rozpoznani_mowcy:
            item = dict(m)
            is_match = item.get("speaker_tag") == payload.speaker_tag
            item["jest_celem"] = is_match
            if is_match and payload.imie_nazwisko:
                item["imie_nazwisko"] = payload.imie_nazwisko
            updated_mowcy.append(item)
        rec.rozpoznani_mowcy = updated_mowcy

    rec.status_przetwarzania = "PROFILOWANIE_AI"
    rec.krok_postepu = f"Przeprowadzanie profilowania dla: {rec.polityk_docelowy or payload.speaker_tag}..."
    await db.commit()
    await db.refresh(rec)

    task_queue.enqueue(run_pipeline_step_by_step, rec.id)
    return rec

@router.post("/{recording_id}/retry", response_model=RecordingResponse)
async def retry_recording_pipeline(recording_id: str, db: AsyncSession = Depends(get_db)):
    """
    Wznawia lub ponawia przetwarzanie nagrania od miejsca, w którym zostało przerwane.
    """
    stmt = select(Recording).options(selectinload(Recording.psychometric_profile)).where(Recording.id == recording_id)
    result = await db.execute(stmt)
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Nagranie nie zostało znalezione.")

    rec.status_przetwarzania = "PRZETWARZANIE"
    rec.krok_postepu = "Wznawianie przetwarzania materiału..."
    rec.blad = None
    await db.commit()
    await db.refresh(rec)

    task_queue.enqueue(run_pipeline_step_by_step, rec.id)
    return rec

@router.get("/{recording_id}/pdf")
async def download_recording_pdf(recording_id: str, db: AsyncSession = Depends(get_db)):
    """
    Generuje i zwraca elegancki plik PDF z audytem wizerunkowym, marketingiem politycznym i profilowaniem.
    """
    from fastapi.responses import StreamingResponse
    from app.services.pdf_generator import pdf_generator
    import io

    stmt = select(Recording).options(selectinload(Recording.psychometric_profile)).where(Recording.id == recording_id)
    result = await db.execute(stmt)
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Nagranie nie zostało znalezione.")

    pdf_bytes = pdf_generator.generate(rec)
    safe_name = "".join(c for c in (rec.polityk_docelowy or "raport") if c.isalnum() or c in ("-", "_")).strip() or "raport"
    filename = f"E-PROFILER_{safe_name}_{recording_id[:8]}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

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
