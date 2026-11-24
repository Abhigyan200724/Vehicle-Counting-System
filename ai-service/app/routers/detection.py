
from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from uuid import uuid4
from starlette.concurrency import run_in_threadpool

from app.services.detector import process_video

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]

UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = UPLOAD_DIR / "outputs"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_SIZE = 200 * 1024 * 1024


@router.post("/video")
async def detect_video(file: UploadFile = File(...)):

    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only MP4, AVI, MOV and MKV videos are supported"
        )

    unique_id = uuid4().hex

    input_path = UPLOAD_DIR / f"{unique_id}{extension}"
    output_name = f"{unique_id}_detected.mp4"
    output_path = OUTPUT_DIR / output_name

    file_size = 0

    try:

        # Save uploaded video safely in chunks
        with input_path.open("wb") as buffer:

            while True:

                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                file_size += len(chunk)

                if file_size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Video size must be below 200 MB"
                    )

                buffer.write(chunk)

        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Uploaded video is empty"
            )

        # Run CPU-intensive detection outside the async event loop
        statistics = await run_in_threadpool(
            process_video,
            input_path,
            output_path
        )

        return {
            "success": True,
            "message": "Vehicle detection completed",
            "video_url": f"/outputs/{output_name}",
            "statistics": statistics
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Detection failed: {str(error)}"
        )

    finally:

        await file.close()

        if input_path.exists():
            input_path.unlink()
