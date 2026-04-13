from fastapi import APIRouter, FastAPI
from routes import base, file_router
from models import File
from database import create_db_and_tables
from fastapi.middleware.cors import CORSMiddleware
import os

def get_app() -> FastAPI:
    app = FastAPI()

    # Allow the frontend origin to be configured via environment variable,
    # falling back to the default local Vite dev server ports.
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            frontend_origin,
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5173",  # add this
            "http://127.0.0.1:5174",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(get_router(), prefix="/api")

    @app.on_event("startup")
    def on_startup():
        create_db_and_tables()

    return app

def get_router() -> APIRouter:
    router = APIRouter()
    router.include_router(base.router, prefix="/base", tags=["Base"])
    router.include_router(file_router.router, prefix="/files", tags=["Files"])
    return router

app = get_app()