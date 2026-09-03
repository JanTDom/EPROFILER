import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    CheckConstraint
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Person(Base):
    __tablename__ = "persons"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    imie_nazwisko = Column(String(255), nullable=False, index=True)
    funkcja = Column(String(255), nullable=True)
    partia = Column(String(255), nullable=True)
    aliasy = Column(JSON, default=list) # lista synonimów / odmian nazwiska
    uwagi = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacje
    segments = relationship("Segment", back_populates="person")
    markers = relationship("Marker", back_populates="person")
    baseline = relationship("PersonBaseline", back_populates="person", uselist=False)


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    zrodlo_typ = Column(String(20), nullable=False) # "plik" lub "url"
    zrodlo_url = Column(Text, nullable=True)
    tytul = Column(String(500), nullable=False)
    data_publikacji = Column(DateTime, nullable=True)
    czas_trwania_sek = Column(Float, default=0.0)
    typ_nagrania = Column(String(50), nullable=False, default="wywiad") # "wywiad", "debata", "przemowienie"
    
    # Status przetwarzania krok po kroku
    # 'OCZEKUJE', 'POBIERANIE', 'TRANSKODOWANIE', 'EKSTRAKCJA_AUDIO', 
    # 'TRANSKRYPCJA', 'DIARYZACJA', 'RETORYKA', 'PROZODIA', 'ZAKONCZONE', 'BLAD'
    status_przetwarzania = Column(String(50), default="OCZEKUJE", index=True)
    krok_postepu = Column(String(100), default="Utworzono zadanie")
    procent_postepu = Column(Integer, default=0)
    
    sciezka_wideo = Column(Text, nullable=True)
    sciezka_audio = Column(Text, nullable=True)
    blad = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacje
    segments = relationship("Segment", back_populates="recording", cascade="all, delete-orphan")
    prosody_features = relationship("ProsodyFeature", back_populates="recording", cascade="all, delete-orphan")
    markers = relationship("Marker", back_populates="recording", cascade="all, delete-orphan")
    interactions = relationship("Interaction", back_populates="recording", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="recording", uselist=False, cascade="all, delete-orphan")


class Segment(Base):
    __tablename__ = "segments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recording_id = Column(String(36), ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False, index=True)
    person_id = Column(String(36), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)
    speaker_tag = Column(String(50), default="SPEAKER_00") # pierwotny tag z diaryzacji
    
    start_ms = Column(Integer, nullable=False, index=True)
    end_ms = Column(Integer, nullable=False)
    tekst = Column(Text, nullable=False)
    pewnosc = Column(Float, nullable=False, default=1.0)
    slowa_z_czasem = Column(JSON, default=list) # [{word, start_ms, end_ms, score}]

    # Relacje
    recording = relationship("Recording", back_populates="segments")
    person = relationship("Person", back_populates="segments")
    prosody = relationship("ProsodyFeature", back_populates="segment", uselist=False)


class ProsodyFeature(Base):
    __tablename__ = "prosody_features"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recording_id = Column(String(36), ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False, index=True)
    segment_id = Column(String(36), ForeignKey("segments.id", ondelete="CASCADE"), nullable=True, unique=True)
    person_id = Column(String(36), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)

    start_ms = Column(Integer, nullable=False)
    end_ms = Column(Integer, nullable=False)
    tempo_wpm = Column(Float, nullable=True) # słowa na minutę
    liczba_pauz = Column(Integer, default=0)
    udzial_pauz = Column(Float, default=0.0) # procent ciszy w segmencie
    f0_mean = Column(Float, nullable=True) # średnia częstotliwość podstawowa Hz
    f0_variance = Column(Float, nullable=True)
    energia = Column(Float, nullable=True)
    odchylenie_baseline_pct = Column(Float, nullable=True) # odchylenie od baseline w %

    recording = relationship("Recording", back_populates="prosody_features")
    segment = relationship("Segment", back_populates="prosody")


class Marker(Base):
    __tablename__ = "markers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recording_id = Column(String(36), ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False, index=True)
    person_id = Column(String(36), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)

    start_ms = Column(Integer, nullable=False, index=True)
    end_ms = Column(Integer, nullable=True)
    
    # "unik" | "technika_retoryczna" | "napiecie_prozodyczne" | "niespojnosc" | "przerwanie"
    typ = Column(String(50), nullable=False, index=True)
    etykieta = Column(String(100), nullable=False)
    opis = Column(Text, nullable=False)
    
    # Nienegocjowalne reguły jakościowe:
    pewnosc = Column(Float, nullable=False) # 0.0 - 1.0
    cytat_dowodowy = Column(Text, nullable=False) # dosłowny cytat
    przeslanki = Column(JSON, default=list) # lista konkretnych obserwacji

    __table_args__ = (
        CheckConstraint('pewnosc >= 0.0 AND pewnosc <= 1.0', name='check_pewnosc_zakres'),
        CheckConstraint("length(cytat_dowodowy) > 0", name='check_cytat_niepusty'),
    )

    recording = relationship("Recording", back_populates="markers")
    person = relationship("Person", back_populates="markers")


class PersonBaseline(Base):
    __tablename__ = "person_baselines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    person_id = Column(String(36), ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    srednie_tempo_wpm = Column(Float, nullable=True)
    typowy_udzial_pauz = Column(Float, nullable=True)
    srednie_f0_hz = Column(Float, nullable=True)
    czeste_techniki = Column(JSON, default=list)
    tematy_unikane = Column(JSON, default=list)
    proba_nagran = Column(Integer, default=0) # ile nagrań złożyło się na profil
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    person = relationship("Person", back_populates="baseline")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recording_id = Column(String(36), ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    przerywajacy_id = Column(String(36), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    przerwany_id = Column(String(36), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    start_ms = Column(Integer, nullable=False)
    czas_trwania_ms = Column(Integer, nullable=False)
    typ = Column(String(50), default="przerwanie") # "przerwanie", "nakladanie_glosow"

    recording = relationship("Recording", back_populates="interactions")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recording_id = Column(String(36), ForeignKey("recordings.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    sekcje_json = Column(JSON, default=dict)
    zastrzezenia = Column(Text, nullable=False) # Obowiązkowa sekcja zastrzeżeń
    wersja = Column(String(20), default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)

    recording = relationship("Recording", back_populates="report")
