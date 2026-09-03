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
    person = Person(
        imie_nazwisko=payload.imie_nazwisko.strip(),
        funkcja=payload.funkcja.strip() if payload.funkcja else None,
        partia=payload.partia.strip() if payload.partia else None,
        aliasy=payload.aliasy,
        uwagi=payload.uwagi.strip() if payload.uwagi else None
    )
    db.add(person)
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
