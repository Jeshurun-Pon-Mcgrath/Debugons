# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from twilio.rest import Client
import random

app = FastAPI(title="Debugons Backend", version="1.0")

# --- Twilio Config ---
# replace with your real Twilio credentials
TWILIO_SID = "your_account_sid"
TWILIO_AUTH = "your_auth_token"
TWILIO_FROM = "+1234567890"  # your Twilio phone number
TO_NUMBER = "+9198xxxxxxx"   # your number to receive alerts

client = Client(TWILIO_SID, TWILIO_AUTH)


# --- Simulation State ---
class Simulation(BaseModel):
    rainfall: float = 0
    seismic: float = 0
    blasting: float = 0


simulation = Simulation()


# --- ML Stub (for now just rule-based) ---
def compute_risk(sim: Simulation) -> float:
    # later you’ll replace this with trained ML model
    risk = (sim.rainfall/300)*0.4 + (sim.seismic/10)*0.4 + (sim.blasting/100)*0.2
    return round(risk * 10, 2)


def send_alert(message: str):
    try:
        client.messages.create(
            body=message,
            from_=TWILIO_FROM,
            to=TO_NUMBER
        )
    except Exception as e:
        print("Twilio Error:", e)


@app.get("/")
def root():
    return {"msg": "✅ Debugons FastAPI Backend running"}


@app.get("/api/risk")
def get_risk():
    risk_score = compute_risk(simulation)
    if risk_score > 7:  # threshold
        send_alert(f"⚠ High Rockfall Risk! Score={risk_score}")
    return {"risk_score": risk_score}


@app.post("/api/simulation")
def update_sim(sim: Simulation):
    global simulation
    simulation = sim
    return {"msg": "Simulation updated", "data": simulation.dict()}