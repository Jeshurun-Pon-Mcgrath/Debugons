from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
import random

# ------------------------
# App Initialization
# ------------------------
app = FastAPI(
    title="Debugons Rockfall Prediction Backend",
    version="1.0.0",
    description="Backend service for rockfall prediction, alerts, and simulations"
)

# ------------------------
# Placeholder Alert Sender
# ------------------------
def send_alert_via_sms(to_number: str, message: str):
    # Placeholder: Replace with Twilio, Firebase, or WhatsApp API later
    print(f"[SIMULATION] SMS to {to_number}: {message}")

# ------------------------
# Data Models
# ------------------------
class Alert(BaseModel):
    id: int
    zone: str
    msg: str
    severity: str
    time: str
    acknowledged: bool = False

class Simulation(BaseModel):
    rainfallMm: float = 0
    seismicMag: float = 0
    blastingLevel: float = 0

# ------------------------
# In-Memory State (Temporary)
# ------------------------
simulation = Simulation()
alerts: List[Alert] = [
    Alert(
        id=1,
        zone="Sector A",
        msg="Rockfall detected",
        severity="High",
        time=datetime.now().isoformat()
    )
]

# ------------------------
# Routes
# ------------------------
@app.get("/")
def root():
    return {"msg": "✅ Debugons Backend Running", "time": datetime.now()}

# ---- Alerts ----
@app.get("/api/alerts", response_model=List[Alert])
def get_alerts():
    return alerts

@app.post("/api/alerts/{alert_id}/ack")
def ack_alert(alert_id: int):
    for alert in alerts:
        if alert.id == alert_id:
            alert.acknowledged = True
            return {"msg": "Alert acknowledged", "alert": alert}
    raise HTTPException(status_code=404, detail="Alert not found")

@app.post("/api/alerts/send")
def send_custom_alert(to_number: str, message: str):
    send_alert_via_sms(to_number, message)
    new_alert = Alert(
        id=len(alerts) + 1,
        zone="Custom",
        msg=message,
        severity="Medium",
        time=datetime.now().isoformat(),
    )
    alerts.append(new_alert)
    return {"msg": "Alert created & SMS simulated", "alert": new_alert}

# ---- Simulation ----
@app.get("/api/simulation", response_model=Simulation)
def get_simulation():
    return simulation

@app.post("/api/simulation")
def update_simulation(new_sim: Simulation):
    global simulation
    simulation = new_sim

    # Example trigger
    if simulation.rainfallMm > 200:
        msg = f"⚠️ Heavy rainfall detected ({simulation.rainfallMm}mm)"
        send_alert_via_sms("+91XXXXXXXXXX", msg)
        alerts.append(
            Alert(
                id=len(alerts) + 1,
                zone="Sector B",
                msg=msg,
                severity="High",
                time=datetime.now().isoformat(),
            )
        )
    return {"msg": "Simulation updated", "simulation": simulation}

# ---- Predictions ----
@app.get("/api/predictions")
def get_predictions():
    labels = ["Now", "1h", "3h", "6h", "12h"]
    values = [round(random.uniform(2, 9), 1) for _ in labels]
    return {"labels": labels, "values": values, "currentRiskScore": values[0]}
