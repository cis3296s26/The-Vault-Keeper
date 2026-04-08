from fastapi import APIRouter, FastAPI
from routes import base, hero_router
from models import Hero, Test
from database import create_db_and_tables

def get_app() -> FastAPI:
    app = FastAPI()
    
    app.include_router(get_router(), prefix="/api")
    
    @app.on_event("startup")
    def on_startup():
        create_db_and_tables()
    
    return app

def get_router() -> APIRouter:
    router = APIRouter()
    router.include_router(base.router, prefix="/base", tags=["Base"])
    router.include_router(hero_router.router, prefix="/heroes", tags=["Heroes"])
    return router

app = get_app()