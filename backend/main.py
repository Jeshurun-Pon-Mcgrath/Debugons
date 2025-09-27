# main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from datetime import datetime
import random

app = FastAPI(title="Debugons Rockfall Prediction Backend")

# ------------------------
# Placeholder Alert Sender
# ------------------------
def send_alert_via_sms(to_number: str, message: str):
    # Later replace this with Twilio
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
# In-Memory State
# ------------------------
simulation = Simulation()
alerts: List[Alert] = [
    Alert(id=1, zone="Sector A", msg="Rockfall detected", severity="High", time=datetime.now().isoformat()),
]

# ------------------------
# APIs
# ------------------------

@app.get("/")
def root():
    return {"msg": "✅ Debugons Backend Running", "time": datetime.now()}

@app.get("/api/alerts")
def get_alerts():
    return alerts

@app.post("/api/alerts/{alert_id}/ack")
def ack_alert(alert_id: int):
    for alert in alerts:
        if alert.id == alert_id:
            alert.acknowledged = True
            return {"msg": "Alert acknowledged", "alert": alert}
    return {"error": "Alert not found"}

@app.post("/api/alerts/send")
def send_custom_alert(to_number: str, message: str):
    # Here Twilio will be integrated later
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

@app.get("/api/simulation")
def get_simulation():
    return simulation

@app.post("/api/simulation")
def update_simulation(new_sim: Simulation):
    global simulation
    simulation = new_sim
    # Example: trigger alert if rainfall is too high
    if simulation.rainfallMm > 200:
        msg = f"Heavy rainfall detected ({simulation.rainfallMm}mm)"
        send_alert_via_sms("+91XXXXXXXXXX", msg)  # Placeholder number
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

@app.get("/api/predictions")
def get_predictions():
    labels = ["Now", "1h", "3h", "6h", "12h"]
    values = [round(random.uniform(2, 9), 1) for _ in labels]
    return {"labels": labels, "values": values, "currentRiskScore": values[0]}