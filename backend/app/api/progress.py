import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models import Recording

router = APIRouter(prefix="/api/progress", tags=["progress"])

@router.get("/{recording_id}")
async def stream_recording_progress(recording_id: str):
    """
    Server-Sent Events (SSE) strumieniujące stan przetwarzania nagrania w czasie rzeczywistym.
    Klient frontendowy podłącza się przez EventSource i otrzymuje aktualizacje co 1 sekundę.
    """
    async def event_generator():
        last_status = None
        last_step = None
        last_pct = -1

        while True:
            async with AsyncSessionLocal() as session:
                stmt = select(Recording).where(Recording.id == recording_id)
                result = await session.execute(stmt)
                rec = result.scalar_one_or_none()

                if not rec:
                    yield f"event: error\ndata: {json.dumps({'error': 'Nagranie nie istnieje'})}\n\n"
                    break

                payload = {
                    "id": rec.id,
                    "status": rec.status_przetwarzania,
                    "krok": rec.krok_postepu,
                    "procent": rec.procent_postepu,
                    "czas_trwania_sek": rec.czas_trwania_sek,
                    "blad": rec.blad
                }

                # Emituj aktualizację jeśli nastąpiła zmiana
                if (rec.status_przetwarzania != last_status or 
                    rec.krok_postepu != last_step or 
                    rec.procent_postepu != last_pct):
                    
                    yield f"event: update\ndata: {json.dumps(payload)}\n\n"
                    last_status = rec.status_przetwarzania
                    last_step = rec.krok_postepu
                    last_pct = rec.procent_postepu

                if rec.status_przetwarzania in {"GOTOWE_DO_TRANSKRYPCJI", "ZAKONCZONE", "BLAD"}:
                    yield f"event: complete\ndata: {json.dumps(payload)}\n\n"
                    break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
