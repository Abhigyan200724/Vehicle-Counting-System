
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.routers import detection
from app.routers import live



app = FastAPI(
    title="Vehicle Counting AI Service",
    description="AI-powered vehicle detection and traffic monitoring",
    version="2.0.0"
)
app.include_router(live.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

BASE_DIR = Path(__file__).resolve().parents[1]

OUTPUT_DIR = BASE_DIR / "uploads" / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app.include_router(
    detection.router,
    prefix="/api/detection",
    tags=["Vehicle Detection"]
)

app.mount(
    "/outputs",
    StaticFiles(directory=str(OUTPUT_DIR)),
    name="outputs"
)


@app.get("/")
def home():

    return {
        "success": True,
        "message": "Vehicle Counting AI Service Running"
    }


@app.get("/health")
def health():

    return {
        "success": True,
        "service": "AI",
        "status": "online"
    }
