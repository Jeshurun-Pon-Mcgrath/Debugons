from fastapi import APIRouter
from pydantic import BaseModel
from utils.twilio_client import send_alert

router = APIRouter()

class AlertRequest(BaseModel):
    message: str
    phone: str

@router.post("/")
def send_alert_api(req: AlertRequest):
    success = send_alert(req.phone, req.message)
    return {"status": "sent" if success else "failed"}