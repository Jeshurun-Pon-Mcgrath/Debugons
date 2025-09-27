from fastapi import APIRouter
from pydantic import BaseModel
from utils.ml_model import predict_risk

router = APIRouter()

class SensorData(BaseModel):
    vibration: float
    rainfall: float
    temperature: float

@router.post("/predict")
def predict(data: SensorData):
    risk = predict_risk([data.vibration, data.rainfall, data.temperature])
    return {"prediction": risk}