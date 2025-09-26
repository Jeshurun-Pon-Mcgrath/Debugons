// backend/server.js
// CommonJS form so you can run with: node server.js

const express = require("express");
const cors = require("cors");

const app = express();

// ---------- Middleware ----------
app.use(express.json());
app.use(
  cors({
    origin: "*", // TODO: restrict to frontend origin if known
    methods: ["GET", "POST"],
  })
);

const PORT = process.env.PORT || 5000;

// ---------- State ----------
let simulation = {
  rainfallMm: 0,    // 0–300 mm
  seismicMag: 0,    // 0–10 scale
  blastingLevel: 0, // 0–100
};

let alerts = [
  { id: 1, zone: "Sector A - West Wall", msg: "Rockfall probability exceeded 85% threshold", severity: "High", time: new Date().toISOString(), acknowledged: false },
  { id: 2, zone: "Sensor Network", msg: "Piezometer S002 showing irregular readings", severity: "Medium", time: new Date(Date.now() - 3600 * 1000).toISOString(), acknowledged: false },
];

const zones = [
  { id: 1, name: "Sector A - West Wall", lat: 20.594, lng: 78.962, baseRisk: 0.75 },
  { id: 2, name: "Sector B - East Wall", lat: 20.601, lng: 78.948, baseRisk: 0.45 },
  { id: 3, name: "Sector C - North Slope", lat: 20.582, lng: 78.972, baseRisk: 0.25 },
];

const sensorDefs = [
  { id: 1, code: "S001", type: "Inclinometer", unit: "mm", location: "Sector A - West Wall", battery: 0.92 },
  { id: 2, code: "S002", type: "Piezometer", unit: "kPa", location: "Sensor Network", battery: 0.69 },
  { id: 3, code: "S003", type: "Seismometer", unit: "g", location: "Sector B - East Wall", battery: 0.67 },
  { id: 4, code: "S004", type: "Weather Station", unit: "mm", location: "Env Station", battery: 0.69 },
  { id: 5, code: "S005", type: "Strain Gauge", unit: "mm", location: "Sector C", battery: 0.78 },
];

// ---------- Helpers ----------
function rnd(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

function generateSensorReading(def) {
  switch (def.type) {
    case "Inclinometer":
      return (0.5 + simulation.blastingLevel * 0.02 + simulation.rainfallMm * 0.01 + rnd() * 2).toFixed(3);
    case "Piezometer":
      return (20 + simulation.rainfallMm * 0.4 + rnd() * 10).toFixed(3);
    case "Seismometer":
      return (Math.max(0, simulation.seismicMag * 0.01 + simulation.blastingLevel * 0.005 + rnd() * 0.03)).toFixed(4);
    case "Weather Station":
      return simulation.rainfallMm > 0 ? simulation.rainfallMm.toFixed(1) : (rnd() * 5).toFixed(1);
    case "Strain Gauge":
      return (0.05 + simulation.blastingLevel * 0.001 + rnd() * 0.2).toFixed(4);
    default:
      return (rnd() * 100).toFixed(2);
  }
}

function computeRiskScore() {
  const avgBase = zones.reduce((s, z) => s + z.baseRisk, 0) / zones.length;
  const rainInfluence = Math.min(1, simulation.rainfallMm / 200);
  const seismicInfluence = Math.min(1, simulation.seismicMag / 8);
  const blastInfluence = Math.min(1, simulation.blastingLevel / 100);

  const composite = avgBase * 0.6 + rainInfluence * 0.2 + seismicInfluence * 0.15 + blastInfluence * 0.05;
  return (composite * 10).toFixed(1);
}

function generatePredictionSeries() {
  const baseline = Number(computeRiskScore());
  const steps = ["Now", "1h", "3h", "6h", "12h", "24h"];
  const values = steps.map((_, i) => {
    const drift = simulation.rainfallMm * 0.01 + simulation.seismicMag * 0.2 + (rnd() * 2 - 1);
    const val = Math.max(0, Math.min(10, baseline + drift * (i / 2)));
    return Math.round(val * 10) / 10;
  });
  return { labels: steps, values };
}

function generateAccuracyHistory() {
  return {
    labels: ["1 Week", "2 Weeks", "1 Month", "3 Months", "6 Months"],
    values: [
      Math.round(88 + rnd() * 7),
      Math.round(85 + rnd() * 8),
      Math.round(80 + rnd() * 10),
      Math.round(78 + rnd() * 8),
      Math.round(75 + rnd() * 8),
    ],
  };
}

function maybeCreateAlert() {
  const currentRisk = Number(computeRiskScore());

  if (currentRisk >= 7.5 && !alerts.some((a) => a.msg.includes("probability exceeded") && !a.acknowledged)) {
    alerts.unshift({
      id: Date.now(),
      zone: "Sector A - West Wall",
      msg: `Rockfall probability exceeded ${(currentRisk * 10).toFixed(0)}% threshold`,
      severity: "High",
      time: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (Math.random() < 0.02 + simulation.blastingLevel / 5000) {
    alerts.unshift({
      id: Date.now() + 1,
      zone: "Sensor Network",
      msg: "Sensor malfunction: irregular readings detected",
      severity: "Medium",
      time: new Date().toISOString(),
      acknowledged: false,
    });
  }

  if (alerts.length > 50) alerts = alerts.slice(0, 50);
}

setInterval(() => {
  if (simulation.rainfallMm > 0) {
    simulation.rainfallMm = Math.max(0, Math.min(300, simulation.rainfallMm + (Math.random() * 4 - 2)));
  }
  simulation.seismicMag = Math.max(0, Math.min(10, simulation.seismicMag + (Math.random() * 0.2 - 0.1)));
  maybeCreateAlert();
}, 3000);

// ---------- Settings ----------
let settings = {
  profile: { name: "Mine Admin", email: "admin@minescope.ai", role: "Admin" },
  preferences: { refreshInterval: 10, units: "metric", language: "en", theme: "dark" },
  alerts: { vibrationThreshold: 3.0, crackThreshold: 2.0, tempThreshold: 35.0, notifyEmail: true, notifySMS: false, notifyPush: true },
  ai: { sensitivity: "balanced", explainable: true },
};

// ---------- Routes ----------
app.get("/", (req, res) => res.send("Rockfall Prediction Backend is Running"));

app.get("/api/settings", (req, res) => res.json(settings));

app.post("/api/settings", (req, res) => {
  // Deep merge
  settings = {
    ...settings,
    ...req.body,
    profile: { ...settings.profile, ...(req.body.profile || {}) },
    preferences: { ...settings.preferences, ...(req.body.preferences || {}) },
    alerts: { ...settings.alerts, ...(req.body.alerts || {}) },
    ai: { ...settings.ai, ...(req.body.ai || {}) },
  };
  res.json({ msg: "✅ Settings updated successfully", settings });
});

app.get("/api/overview", (req, res) => {
  const activeAlerts = alerts.filter((a) => !a.acknowledged).length;
  const sensorsOnline = Math.round(sensorDefs.length * 0.9);
  const riskScore = computeRiskScore();
  const weatherImpact = simulation.rainfallMm > 50 ? "High" : simulation.rainfallMm > 10 ? "Moderate" : "Low";
  res.json({ activeAlerts, sensorsOnline: `${sensorsOnline}/${sensorDefs.length}`, riskScore, weatherImpact, lastUpdated: new Date().toISOString() });
});

app.get("/api/sensors", (req, res) => {
  const data = sensorDefs.map((def) => {
    const reading = generateSensorReading(def);
    const offlineChance = Math.random() < 0.02;
    const status = offlineChance ? "offline" : Math.random() < 0.05 ? "warning" : "online";
    return {
      id: def.id,
      code: def.code,
      type: def.type,
      location: def.location,
      value: `${reading} ${def.unit}`,
      battery: `${Math.round((def.battery - Math.random() * 0.05) * 100)}%`,
      status,
      lastUpdate: new Date().toISOString(),
    };
  });
  res.json(data);
});

app.get("/api/sensors/:id/history", (req, res) => {
  const sensorId = Number(req.params.id);
  const history = Array.from({ length: 12 }).map((_, i) => ({
    ts: new Date(Date.now() - i * 60000).toISOString(),
    value: (Math.random() * 100).toFixed(3),
  })).reverse();
  res.json({ sensorId, history });
});

app.get("/api/alerts", (req, res) => res.json(alerts.slice(0, 20)));

app.post("/api/alerts/:id/ack", (req, res) => {
  const id = Number(req.params.id);
  const alert = alerts.find((a) => a.id === id);
  if (!alert) return res.status(404).json({ error: "Alert not found" });
  alert.acknowledged = true;
  res.json({ msg: "Acknowledged", alert });
});

app.get("/api/predictions", (req, res) => res.json({ currentRiskScore: computeRiskScore(), series: generatePredictionSeries(), accuracy: generateAccuracyHistory() }));

app.get("/api/map", (req, res) => {
  const map = zones.map((z) => {
    const rainfallFactor = Math.min(1, simulation.rainfallMm / 200);
    const seismicFactor = Math.min(1, simulation.seismicMag / 8);
    const score = Math.min(1, z.baseRisk * 0.6 + rainfallFactor * 0.25 + seismicFactor * 0.15 + rnd() * 0.05);
    let severity = "Low";
    if (score > 0.7) severity = "High";
    else if (score > 0.4) severity = "Medium";
    return { ...z, score: Number(score.toFixed(2)), severity };
  });
  res.json(map);
});

app.get("/api/simulation", (req, res) => res.json(simulation));

app.post("/api/simulation", (req, res) => {
  const body = req.body || {};
  ["rainfallMm", "seismicMag", "blastingLevel"].forEach((k) => {
    if (body[k] !== undefined) {
      if (k === "rainfallMm") simulation.rainfallMm = Math.max(0, Math.min(300, Number(body[k])));
      if (k === "seismicMag") simulation.seismicMag = Math.max(0, Math.min(10, Number(body[k])));
      if (k === "blastingLevel") simulation.blastingLevel = Math.max(0, Math.min(100, Number(body[k])));
    }
  });

  if (simulation.rainfallMm > 150 || simulation.seismicMag > 6) {
    alerts.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      zone: "Simulated",
      msg: `Simulation triggered HIGH-RISK conditions (rain=${simulation.rainfallMm}, seismic=${simulation.seismicMag})`,
      severity: "High",
      time: new Date().toISOString(),
      acknowledged: false,
    });
  }

  res.json({ msg: "Simulation updated", simulation });
});

app.get("/api/export/report", (req, res) => {
  const payload = {
    generatedAt: new Date().toISOString(),
    overview: { riskScore: computeRiskScore(), activeAlerts: alerts.filter((a) => !a.acknowledged).length, sensorsOnline: Math.round(sensorDefs.length * 0.9) },
    topAlerts: alerts.slice(0, 5),
    topZones: zones.map((z) => ({ id: z.id, name: z.name })),
  };
  res.json(payload);
});

// ---------- Error Handling ----------
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ---------- Start ----------
app.listen(PORT, () => console.log(`Rockfall Prediction Backend running on http://localhost:${PORT}`));
