from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def index():
    """Health check - confirms API is running"""
    return {"status": "ok", "message": "Vault Keeper API is running"}