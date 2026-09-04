import sqlite3
import json
from datetime import datetime
import asyncio
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = settings.DATABASE_URL

def parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        val_clean = str(val).strip().replace(" ", "T")
        return datetime.fromisoformat(val_clean)
    except Exception as e:
        print(f"Warning: could not parse dt {val}: {e}")
        return None

def parse_json(val):
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return val

async def migrate():
    print("Connecting to SQLite...")
    sqlite_conn = sqlite3.connect("profiler.db")
    sqlite_conn.row_factory = sqlite3.Row
    s_cur = sqlite_conn.cursor()

    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as pg_conn:
        # 1. Persons
        print("Migrating persons...")
        s_cur.execute("SELECT * FROM persons")
        persons = [dict(row) for row in s_cur.fetchall()]
        for p in persons:
            p["created_at"] = parse_dt(p.get("created_at"))
            p["aliasy"] = json.dumps(parse_json(p.get("aliasy")) or [])
            await pg_conn.execute(
                text("""
                    INSERT INTO persons (id, imie_nazwisko, funkcja, partia, aliasy, uwagi, created_at)
                    VALUES (:id, :imie_nazwisko, :funkcja, :partia, CAST(:aliasy AS json), :uwagi, :created_at)
                    ON CONFLICT (id) DO NOTHING
                """),
                p
            )
        print(f"Persons migrated: {len(persons)}")

        # 2. Recordings
        print("Migrating recordings...")
        s_cur.execute("SELECT * FROM recordings")
        recordings = [dict(row) for row in s_cur.fetchall()]
        for r in recordings:
            r["data_publikacji"] = parse_dt(r.get("data_publikacji"))
            r["created_at"] = parse_dt(r.get("created_at"))
            r["updated_at"] = parse_dt(r.get("updated_at"))
            r["tryb_biometryczny"] = bool(r.get("tryb_biometryczny", True))
            r["rozpoznani_mowcy"] = json.dumps(parse_json(r.get("rozpoznani_mowcy")) or [])
            await pg_conn.execute(
                text("""
                    INSERT INTO recordings (
                        id, zrodlo_typ, zrodlo_url, tytul, data_publikacji, czas_trwania_sek,
                        typ_nagrania, status_przetwarzania, krok_postepu, procent_postepu,
                        sciezka_wideo, sciezka_audio, blad, tryb_biometryczny, zakres_analizy,
                        polityk_docelowy, rola_polityka, speaker_docelowy_tag, rozpoznani_mowcy,
                        created_at, updated_at
                    ) VALUES (
                        :id, :zrodlo_typ, :zrodlo_url, :tytul, :data_publikacji, :czas_trwania_sek,
                        :typ_nagrania, :status_przetwarzania, :krok_postepu, :procent_postepu,
                        :sciezka_wideo, :sciezka_audio, :blad, :tryb_biometryczny, :zakres_analizy,
                        :polityk_docelowy, :rola_polityka, :speaker_docelowy_tag, CAST(:rozpoznani_mowcy AS json),
                        :created_at, :updated_at
                    )
                    ON CONFLICT (id) DO NOTHING
                """),
                r
            )
        print(f"Recordings migrated: {len(recordings)}")

        # 3. Psychometric profiles
        print("Migrating psychometric_profiles...")
        s_cur.execute("SELECT * FROM psychometric_profiles")
        profiles = [dict(row) for row in s_cur.fetchall()]
        for prof in profiles:
            for json_col in [
                "czule_punkty_i_leki", "mocne_strony", "skutecznosc_argumentacji",
                "perswazyjnosc_odbiorcow", "radzenie_z_adwersarzami", "glowne_uniki_i_taktyka",
                "spojnosc_mowy_ze_slowami", "surowe_wnioski_ai"
            ]:
                if json_col in prof:
                    val = prof[json_col]
                    if val is not None:
                        prof[json_col] = json.dumps(parse_json(val))
                    else:
                        prof[json_col] = None

            await pg_conn.execute(
                text("""
                    INSERT INTO psychometric_profiles (
                        id, recording_id, person_id, otwartosc, sumiennosc, ekstrawersja,
                        ugodowosc, neurotyzm, dominacja_vs_uleglosc, wrogosc_vs_cieplo,
                        nastroj_glowny_prosty, styl_komunikacji_prosty,
                        czule_punkty_i_leki, mocne_strony, skutecznosc_argumentacji,
                        perswazyjnosc_odbiorcow, radzenie_z_adwersarzami,
                        glowne_uniki_i_taktyka, spojnosc_mowy_ze_slowami, surowe_wnioski_ai
                    ) VALUES (
                        :id, :recording_id, :person_id, :otwartosc, :sumiennosc, :ekstrawersja,
                        :ugodowosc, :neurotyzm, :dominacja_vs_uleglosc, :wrogosc_vs_cieplo,
                        :nastroj_glowny_prosty, :styl_komunikacji_prosty,
                        CAST(:czule_punkty_i_leki AS json), CAST(:mocne_strony AS json),
                        CAST(:skutecznosc_argumentacji AS json), CAST(:perswazyjnosc_odbiorcow AS json),
                        CAST(:radzenie_z_adwersarzami AS json), CAST(:glowne_uniki_i_taktyka AS json),
                        CAST(:spojnosc_mowy_ze_slowami AS json), CAST(:surowe_wnioski_ai AS json)
                    )
                    ON CONFLICT (id) DO NOTHING
                """),
                prof
            )
        print(f"Psychometric profiles migrated: {len(profiles)}")

        # 4. Reports (if any)
        s_cur.execute("SELECT * FROM reports")
        reports = [dict(row) for row in s_cur.fetchall()]
        for rep in reports:
            rep["created_at"] = parse_dt(rep.get("created_at"))
            rep["sekcje_json"] = json.dumps(parse_json(rep.get("sekcje_json")) or {})
            await pg_conn.execute(
                text("""
                    INSERT INTO reports (id, recording_id, sekcje_json, zastrzezenia, wersja, created_at)
                    VALUES (:id, :recording_id, CAST(:sekcje_json AS json), :zastrzezenia, :wersja, :created_at)
                    ON CONFLICT (id) DO NOTHING
                """),
                rep
            )
        print(f"Reports migrated: {len(reports)}")

    print("Migration finished successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
