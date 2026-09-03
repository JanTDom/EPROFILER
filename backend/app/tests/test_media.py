import pytest
from app.services.media import media_service

@pytest.mark.asyncio
async def test_non_existent_file_duration_returns_zero():
    duration = await media_service.get_media_duration("/tmp/non_existent_video_12345.mp4")
    assert duration == 0.0

@pytest.mark.asyncio
async def test_transcode_missing_file_raises_error():
    with pytest.raises(Exception):
        await media_service.transcode_to_web_proxy(
            "/tmp/non_existent_in.mp4",
            "/tmp/non_existent_out.mp4"
        )
