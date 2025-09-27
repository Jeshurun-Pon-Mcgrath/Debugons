from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Temporary in-memory store
settings_data = {
    "profile": {"name": "User", "email": "user@example.com"},
    "preferences": {"refreshInterval": 30, "theme": "dark"},
    "alerts": {"vibrationThreshold": 50, "notifyEmail": True},
    "ai": {"sensitivity": "balanced"},
}

class Settings(BaseModel):
    profile: dict
    preferences: dict
    alerts: dict
    ai: dict

@router.get("/")
def get_settings():
    return settings_data

@router.post("/")
def update_settings(new_settings: Settings):
    global settings_data
    settings_data = new_settings.dict()
    return {"message": "✅ Settings updated", "data": settings_data}