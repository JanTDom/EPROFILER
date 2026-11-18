from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.db.models import Person

router = APIRouter(prefix="/api/persons", tags=["persons"])

class PersonCreate(BaseModel):
    imie_nazwisko: str
    funkcja: Optional[str] = None
    partia: Optional[str] = None
    aliasy: List[str] = []
    uwagi: Optional[str] = None

class PersonResponse(BaseModel):
    id: str
    imie_nazwisko: str
    funkcja: Optional[str] = None
    partia: Optional[str] = None
    aliasy: List[str] = []
    uwagi: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

@router.get("", response_model=List[PersonResponse])
async def list_persons(db: AsyncSession = Depends(get_db)):
    stmt = select(Person).order_by(Person.imie_nazwisko)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
async def create_person(payload: PersonCreate, db: AsyncSession = Depends(get_db)):
    from app.services.person_matcher import person_matcher
    person, is_new, score = await person_matcher.find_or_resolve_person(
        db,
        input_name=payload.imie_nazwisko.strip(),
        create_if_missing=True,
        party=payload.partia.strip() if payload.partia else None,
        role=payload.funkcja.strip() if payload.funkcja else None
    )
    if payload.aliasy:
        cur_aliases = list(person.aliasy or [])
        for a in payload.aliasy:
            if a not in cur_aliases and a.lower() != person.imie_nazwisko.lower():
                cur_aliases.append(a)
        person.aliasy = cur_aliases
    if payload.uwagi:
        person.uwagi = payload.uwagi.strip()
    await db.commit()
    await db.refresh(person)
    return person

@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(person_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Person).where(Person.id == person_id)
    result = await db.execute(stmt)
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Osoba nie została znaleziona.")
    return person

@router.get("/{person_id}/dossier")
async def get_person_dossier(person_id: str, db: AsyncSession = Depends(get_db)):
    """Pobiera pełne, ustrukturyzowane dossier poznawczo-retoryczne polityka."""
    from app.services.knowledge_base_service import knowledge_base_service
    dossier = await knowledge_base_service.get_person_dossier(db, person_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier osoby nie zostało znalezione.")
    return dossier

@router.post("/{person_id}/bootstrap")
async def bootstrap_person_knowledge(person_id: str, db: AsyncSession = Depends(get_db)):
    """Zasila 'na zimno' (cold-start) bazę wiedzy o polityku danymi z sieci i archiwów."""
    stmt = select(Person).where(Person.id == person_id)
    result = await db.execute(stmt)
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Osoba nie została znaleziona.")
    
    from app.services.knowledge_base_service import knowledge_base_service
    res = await knowledge_base_service.bootstrap_person_dossier(db, person)
    return res

@router.post("/{person_id}/reconcile")
async def reconcile_person_recordings(person_id: str, db: AsyncSession = Depends(get_db)):
    """Przelicza i re-asymiluje wszystkie powiązane nagrania dla wskazanego polityka."""
    from app.db.models import Recording
    from app.services.knowledge_base_service import knowledge_base_service
    
    stmt = select(Person).where(Person.id == person_id)
    res = await db.execute(stmt)
    person = res.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Osoba nie została znaleziona.")

    rec_stmt = select(Recording).where(
        Recording.polityk_docelowy == person.imie_nazwisko,
        Recording.status_przetwarzania == "ZAKONCZONE"
    )
    rec_res = await db.execute(rec_stmt)
    recordings = rec_res.scalars().all()

    ingested = 0
    for r in recordings:
        try:
            await knowledge_base_service.ingest_recording_to_dossier(db, r.id, person.id)
            ingested += 1
        except Exception as e:
            continue

    return {"status": "sukces", "przeliczono_nagran": ingested, "ogolem_nagran": len(recordings)}
