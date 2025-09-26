import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:5000";

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-shadow ${
      active
        ? "bg-green-500 text-white shadow-[0_6px_20px_rgba(16,185,129,0.12)]"
        : "bg-transparent text-gray-300 border border-transparent hover:bg-gray-800"
    }`}
  >
    {children}
  </button>
);

function KPI({ title, value, subtitle, accent }) {
  return (
    <div className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.03)] rounded-xl px-6 py-5 shadow-inner">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-300">{title}</div>
          <div className={`text-3xl font-bold ${accent ?? "text-white"}`}>{value}</div>
        </div>
        <div className="text-right text-xs text-gray-400">{subtitle}</div>
      </div>
    </div>
  );
}

/**
 * SettingsPanel (embedded) - fetches and updates /api/settings
 * Expected backend endpoints:
 *  GET  /api/settings  -> returns settings object
 *  POST /api/settings  -> accepts settings object to update
 *
 * Settings shape (example):
 * {
 *   profile: { name, email, role },
 *   preferences: { refreshInterval (sec), units, language, theme },
 *   alerts: { vibrationThreshold, crackThreshold, tempThreshold, notifyEmail, notifySMS, notifyPush },
 *   ai: { sensitivity, explainable }
 * }
 */
function SettingsPanel({ onApplySettings }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // load settings from backend
  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE}/api/settings`)
      .then((r) => {
        if (!mounted) return;
        setSettings(r.data);
      })
      .catch((err) => {
        console.error("Failed fetch settings:", err);
        setError("Failed to load settings");
        // fallback: create minimal default locally
        setSettings({
          profile: { name: "Mine Admin", email: "admin@minescope.ai", role: "Admin" },
          preferences: { refreshInterval: 10, units: "metric", language: "en", theme: "dark" },
          alerts: { vibrationThreshold: 3.0, crackThreshold: 2.0, tempThreshold: 35.0, notifyEmail: true, notifySMS: false, notifyPush: true },
          ai: { sensitivity: "balanced", explainable: true },
        });
      });
    return () => (mounted = false);
  }, []);

  // apply change helper
  const updateField = (path, value) => {
    // path: ["preferences","refreshInterval"] etc
    setSettings((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      let cur = copy;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return copy;
    });
  };

  // Save to backend
  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const resp = await axios.post(`${API_BASE}/api/settings`, settings);
      setSettings(resp.data.settings || settings);
      onApplySettings && onApplySettings(settings);
    } catch (err) {
      console.error("Save settings error", err);
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div className="p-6 text-gray-400">Loading settings...</div>;

  return (
    <div className="p-6 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.03)] shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xl font-bold">⚙️ System Settings</div>
          <div className="text-sm text-gray-400">Configure system behavior, alerts and AI options</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-500 rounded-md text-sm">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.01)]">
          <div className="text-sm text-gray-300 font-semibold mb-2">Profile</div>
          <input className="w-full p-2 mb-2 rounded bg-gray-800" value={settings.profile.name} onChange={(e) => updateField(["profile", "name"], e.target.value)} />
          <input className="w-full p-2 mb-2 rounded bg-gray-800" value={settings.profile.email} onChange={(e) => updateField(["profile", "email"], e.target.value)} />
          <div className="text-xs text-gray-400">Role: {settings.profile.role}</div>
        </div>

        {/* Preferences */}
        <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.01)]">
          <div className="text-sm text-gray-300 font-semibold mb-2">Preferences</div>

          <div className="mb-3">
            <label className="text-xs text-gray-400">Refresh Interval (sec)</label>
            <input
              type="number"
              min="2"
              className="w-28 ml-2 p-2 rounded bg-gray-800"
              value={settings.preferences.refreshInterval}
              onChange={(e) => updateField(["preferences", "refreshInterval"], Number(e.target.value))}
            />
          </div>

          <div className="mb-3">
            <label className="text-xs text-gray-400">Units</label>
            <select className="ml-2 p-2 rounded bg-gray-800" value={settings.preferences.units} onChange={(e) => updateField(["preferences", "units"], e.target.value)}>
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400">Theme</label>
            <select className="ml-2 p-2 rounded bg-gray-800" value={settings.preferences.theme} onChange={(e) => updateField(["preferences", "theme"], e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="neon">Futuristic Neon</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts & AI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.01)]">
          <div className="text-sm text-gray-300 font-semibold mb-2">Alert Configuration</div>
          <div className="mb-2">
            <label className="text-xs text-gray-400">Vibration Threshold (Hz)</label>
            <input type="number" step="0.1" className="w-28 ml-2 p-2 rounded bg-gray-800" value={settings.alerts.vibrationThreshold} onChange={(e) => updateField(["alerts", "vibrationThreshold"], Number(e.target.value))} />
          </div>
          <div className="mb-2">
            <label className="text-xs text-gray-400">Crack Width Threshold (mm)</label>
            <input type="number" step="0.1" className="w-28 ml-2 p-2 rounded bg-gray-800" value={settings.alerts.crackThreshold} onChange={(e) => updateField(["alerts", "crackThreshold"], Number(e.target.value))} />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <label className="text-xs text-gray-400">Email</label>
            <input type="checkbox" checked={settings.alerts.notifyEmail} onChange={(e) => updateField(["alerts", "notifyEmail"], e.target.checked)} />
            <label className="text-xs text-gray-400 ml-3">SMS</label>
            <input type="checkbox" checked={settings.alerts.notifySMS} onChange={(e) => updateField(["alerts", "notifySMS"], e.target.checked)} />
            <label className="text-xs text-gray-400 ml-3">Push</label>
            <input type="checkbox" checked={settings.alerts.notifyPush} onChange={(e) => updateField(["alerts", "notifyPush"], e.target.checked)} />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.01)]">
          <div className="text-sm text-gray-300 font-semibold mb-2">AI Settings</div>
          <div className="mb-3">
            <label className="text-xs text-gray-400">Sensitivity</label>
            <select value={settings.ai.sensitivity} onChange={(e) => updateField(["ai", "sensitivity"], e.target.value)} className="ml-2 p-2 rounded bg-gray-800">
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mr-2">Explainable AI</label>
            <input type="checkbox" checked={settings.ai.explainable} onChange={(e) => updateField(["ai", "explainable"], e.target.checked)} />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">{error ? <span className="text-red-400">{error}</span> : "Changes are saved to server when you click Save."}</div>
        <div className="flex items-center gap-3">
          <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(settings, null, 2)); }} className="px-3 py-2 rounded bg-slate-700 text-sm">Copy JSON</button>
          <button onClick={() => { setSettings(prev => ({ // reset local to backend snapshot quickly by re-fetch
            ...prev
          })); }} className="px-3 py-2 rounded bg-gray-700 text-sm">Reset View</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-emerald-500 text-sm">{saving ? "Saving..." : "Save to Server"}</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // main dashboard state
  const [tab, setTab] = useState("predictions");
  const [overview, setOverview] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [predictions, setPredictions] = useState({ currentRiskScore: 0, series: { labels: [], values: [] }, accuracy: null });
  const [zones, setZones] = useState([]);
  const [simulation, setSimulation] = useState({ rainfallMm: 0, seismicMag: 0, blastingLevel: 0 });
  const [loading, setLoading] = useState(true);

  // settings & visibility
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(null);

  // refresh interval (controlled by settings.preferences.refreshInterval)
  const refreshRef = useRef(10000); // ms default to 10s; will set after settings loaded
  const intervalRef = useRef(null);

  // fetch settings initially and when settings change on server
  const fetchSettings = async () => {
    try {
      const r = await axios.get(`${API_BASE}/api/settings`);
      setSettings(r.data);
      applyTheme(r.data?.preferences?.theme || "dark");
      const sec = Number(r.data?.preferences?.refreshInterval || 10);
      refreshRef.current = Math.max(2, sec) * 1000;
      restartFetchInterval();
    } catch (err) {
      console.error("fetchSettings error", err);
    }
  };

  // apply theme by toggling class on html element (simple approach)
  const applyTheme = (theme) => {
    const el = document.documentElement;
    el.classList.remove("theme-dark", "theme-light", "theme-neon");
    if (theme === "neon") el.classList.add("theme-neon");
    else if (theme === "light") el.classList.add("theme-light");
    else el.classList.add("theme-dark");
  };

  // fetch all data helper
  const fetchAll = async () => {
    try {
      const [ov, ss, al, pr, mz, sim] = await Promise.all([
        axios.get(`${API_BASE}/api/overview`).then(r => r.data).catch(()=>null),
        axios.get(`${API_BASE}/api/sensors`).then(r => r.data).catch(()=>[]),
        axios.get(`${API_BASE}/api/alerts`).then(r => r.data).catch(()=>[]),
        axios.get(`${API_BASE}/api/predictions`).then(r => r.data).catch(()=>({currentRiskScore:0, series:{labels:[], values:[]}, accuracy:null})),
        axios.get(`${API_BASE}/api/map`).then(r => r.data).catch(()=>[]),
        axios.get(`${API_BASE}/api/simulation`).then(r => r.data).catch(()=>({rainfallMm:0,seismicMag:0,blastingLevel:0})),
      ]);
      if (ov) setOverview(ov);
      setSensors(ss || []);
      setAlerts(al || []);
      setPredictions(pr || {});
      setZones(mz || []);
      setSimulation(sim || {});
      setLoading(false);
    } catch (err) {
      console.error("fetchAll error:", err);
    }
  };

  // start/stop periodic fetch based on refreshRef
  const restartFetchInterval = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      fetchAll();
    }, refreshRef.current);
  };

  useEffect(() => {
    // initial
    fetchSettings();
    fetchAll();
    // default interval until settings load
    intervalRef.current = setInterval(fetchAll, refreshRef.current);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // announce settings updates from SettingsPanel
  const onApplySettings = (newSettings) => {
    if (!newSettings) return;
    setSettings(newSettings);
    applyTheme(newSettings.preferences?.theme || "dark");
    const sec = Number(newSettings.preferences?.refreshInterval || 10);
    refreshRef.current = Math.max(2, sec) * 1000;
    restartFetchInterval();
  };

  const ackAlert = async (id) => {
    try {
      await axios.post(`${API_BASE}/api/alerts/${id}/ack`);
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a)));
      fetchAll();
    } catch (err) {
      console.error("ack failed", err);
    }
  };

  const setSimValue = async (key, val) => {
    const payload = {};
    payload[key] = Number(val);
    try {
      await axios.post(`${API_BASE}/api/simulation`, payload);
      fetchAll();
    } catch (err) {
      console.error("simulation post", err);
    }
  };

  // Chart data
  const accuracyChart = useMemo(() => {
    if (!predictions.accuracy) return null;
    return {
      labels: predictions.accuracy.labels,
      datasets: [
        {
          label: "Model Accuracy (%)",
          data: predictions.accuracy.values,
          backgroundColor: "rgba(16,185,129,0.9)",
        },
      ],
    };
  }, [predictions]);

  const predictionLine = useMemo(() => {
    const s = predictions.series || { labels: [], values: [] };
    return {
      labels: s.labels,
      datasets: [
        {
          label: "Risk (0-10)",
          data: s.values,
          borderColor: "rgba(139,92,246,1)",
          backgroundColor: "rgba(139,92,246,0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    };
  }, [predictions]);

  // small UI: show live refresh interval
  const refreshSec = Math.round((refreshRef.current || 10000) / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1724] to-[#071021] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-gradient-to-tr from-green-400 to-teal-400 flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" /></svg>
          </div>
          <div>
            <div className="text-xl font-bold">Debugons AI</div>
            <div className="text-xs text-gray-400">Rockfall Prediction & Alert System</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-300 bg-[rgba(255,255,255,0.02)] px-3 py-2 rounded-md">System Online</div>
          <button onClick={() => setShowSettings(prev => !prev)} className="px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] text-sm">
            {showSettings ? "Close Settings" : "Settings"}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KPI title="Active Alerts" value={overview ? overview.activeAlerts : "..."} subtitle="+2 from yesterday" accent="text-red-300" />
        <KPI title="Sensors Online" value={overview ? overview.sensorsOnline : "..."} subtitle={`${refreshSec}s refresh`} accent="text-green-300" />
        <KPI title="Risk Score" value={overview ? `${overview.riskScore}/10` : "..."} subtitle="+0.3 this hour" />
        <KPI title="Weather Impact" value={overview ? overview.weatherImpact : "..."} subtitle="Rain expected 2PM" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.02)] p-3 rounded-xl mb-6">
        <TabButton active={tab === "map"} onClick={() => setTab("map")}>Risk Map</TabButton>
        <TabButton active={tab === "sensors"} onClick={() => setTab("sensors")}>Sensors</TabButton>
        <TabButton active={tab === "predictions"} onClick={() => setTab("predictions")}>Predictions</TabButton>
        <TabButton active={tab === "alerts"} onClick={() => setTab("alerts")}>Alerts</TabButton>
        <TabButton active={tab === "simulate"} onClick={() => setTab("simulate")}>Simulator</TabButton>
      </div>

      {/* Content */}
      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        {/* Settings area (embedded) */}
        {showSettings && <SettingsPanel onApplySettings={onApplySettings} />}

        {/* PREDICTIONS */}
        {!showSettings && tab === "predictions" && (
          <div className="bg-[rgba(255,255,255,0.02)] p-6 rounded-xl border border-[rgba(255,255,255,0.02)]">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">AI Rockfall Prediction Engine</h3>
                  <div>
                    <button onClick={() => fetchAll()} className="px-4 py-2 bg-indigo-600 rounded-md">Generate Prediction</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-lg">
                    <div className="text-sm text-gray-300 mb-2 font-semibold">Model Accuracy History</div>
                    {accuracyChart ? <Bar data={accuracyChart} options={{ responsive: true, plugins: { legend: { display: false } } }} /> : <div className="text-gray-400">Loading...</div>}
                  </div>

                  <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-lg">
                    <div className="text-sm text-gray-300 mb-2 font-semibold">Current Risk Overview</div>
                    <div className="h-56 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl font-bold text-pink-400">{predictions.currentRiskScore ?? "..."}/10</div>
                        <div className="text-sm text-gray-400 mt-2">Realtime AI risk index</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-96">
                <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-lg mb-4">
                  <div className="text-sm text-gray-300 font-semibold mb-2">Prediction Timeline</div>
                  <Line data={predictionLine} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                </div>

                <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-lg">
                  <div className="text-sm text-gray-300 font-semibold mb-2">Quick Actions</div>
                  <div className="flex gap-2">
                    <button onClick={async ()=>{ const r = await axios.get(`${API_BASE}/api/export/report`); const blob = new Blob([JSON.stringify(r.data,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'report.json'; a.click(); }} className="flex-1 px-3 py-2 bg-purple-600 rounded-md">Export Report</button>
                    <button className="px-3 py-2 bg-slate-700 rounded-md">Explain (SHAP)</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAP */}
        {!showSettings && tab === "map" && (
          <div className="bg-[rgba(255,255,255,0.02)] p-6 rounded-xl">
            <div className="text-lg font-semibold mb-4">Risk Heatmap - Open Pit Mine</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-black/40 rounded-lg h-96 overflow-hidden">
                <MapContainer center={[20.5937, 78.9629]} zoom={13} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {zones.map(z => {
                    const color = z.severity === "High" ? "#ff4d4f" : z.severity === "Medium" ? "#ffb020" : "#22c55e";
                    return (
                      <CircleMarker key={z.id} center={[z.lat, z.lng]} radius={40} pathOptions={{ color, fillColor: color, fillOpacity: 0.25 }}>
                        <Popup><b>{z.name}</b><br/>Risk: {z.severity} ({z.score})</Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>

              <div className="bg-[rgba(255,255,255,0.02)] p-4 rounded-lg">
                <div className="text-sm text-gray-300 font-semibold mb-3">Active Alerts</div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {alerts.map(a => (
                    <div key={a.id} className={`p-3 rounded-md ${a.severity==="High" ? "bg-red-700/30" : a.severity==="Medium" ? "bg-yellow-700/20" : "bg-green-700/20"}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{a.msg}</div>
                          <div className="text-xs text-gray-300">{a.zone} • {new Date(a.time).toLocaleString()}</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button disabled={a.acknowledged} onClick={() => ackAlert(a.id)} className="px-3 py-1 rounded bg-emerald-500/80 text-sm">Acknowledge</button>
                          <div className="text-xs text-gray-300">{a.severity}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <button onClick={fetchAll} className="px-4 py-2 rounded-md bg-slate-700">Refresh Map Data</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SENSORS */}
        {!showSettings && tab === "sensors" && (
          <div className="bg-[rgba(255,255,255,0.02)] p-6 rounded-xl">
            <div className="text-lg font-semibold mb-4">Sensors</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sensors.map(s => (
                <div key={s.id} className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.02)]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-sm text-gray-300">{s.code}</div>
                      <div className="text-xs text-gray-400">{s.type}</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-md ${s.status==="online" ? "bg-green-600/30" : s.status==="warning" ? "bg-yellow-600/30" : "bg-red-600/30"}`}>
                      {s.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-1">{s.value}</div>
                  <div className="text-xs text-gray-400 mb-2">Battery: {s.battery}</div>
                  <div className="text-xs text-gray-500">Last update: {new Date(s.lastUpdate).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALERTS */}
        {!showSettings && tab === "alerts" && (
          <div className="bg-[rgba(255,255,255,0.02)] p-6 rounded-xl">
            <div className="text-lg font-semibold mb-4">Alert Management</div>

            <div className="grid grid-cols-1 gap-4">
              {alerts.map(a => (
                <div key={a.id} className={`p-4 rounded-lg ${a.severity==="High" ? "bg-red-700/20" : a.severity==="Medium" ? "bg-yellow-700/10" : "bg-green-700/10"}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold">{a.msg}</div>
                      <div className="text-xs text-gray-300">Sector: {a.zone} • {new Date(a.time).toLocaleTimeString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-slate-700 rounded-md">View Details</button>
                      <button onClick={() => ackAlert(a.id)} disabled={a.acknowledged} className="px-3 py-1 bg-emerald-500 rounded-md">{a.acknowledged ? "Acknowledged" : "Acknowledge"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SIMULATOR */}
        {!showSettings && tab === "simulate" && (
          <div className="bg-[rgba(255,255,255,0.02)] p-6 rounded-xl">
            <div className="text-lg font-semibold mb-4">What-If Scenario Simulator</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)]">
                <div className="mb-3 font-semibold">Simulation Parameters</div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300">Rainfall (mm) — {simulation.rainfallMm}</label>
                    <input type="range" min="0" max="300" value={simulation.rainfallMm} onChange={(e) => setSimulation(prev => ({...prev, rainfallMm: Number(e.target.value)}))} onMouseUp={(e) => setSimValue("rainfallMm", e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Seismic Magnitude — {simulation.seismicMag}</label>
                    <input type="range" min="0" max="10" step="0.1" value={simulation.seismicMag} onChange={(e) => setSimulation(prev => ({...prev, seismicMag: Number(e.target.value)}))} onMouseUp={(e) => setSimValue("seismicMag", e.target.value)} className="w-full" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300">Blasting Level — {simulation.blastingLevel}%</label>
                    <input type="range" min="0" max="100" value={simulation.blastingLevel} onChange={(e) => setSimulation(prev => ({...prev, blastingLevel: Number(e.target.value)}))} onMouseUp={(e) => setSimValue("blastingLevel", e.target.value)} className="w-full" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => { setSimValue("rainfallMm", 0); setSimValue("seismicMag",0); setSimValue("blastingLevel",0); }} className="px-4 py-2 rounded-md bg-slate-700">Reset</button>
                  <button onClick={() => fetchAll()} className="px-4 py-2 rounded-md bg-emerald-500">Run Simulation</button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)]">
                <div className="mb-3 font-semibold">Simulation Output</div>
                <div className="text-4xl font-bold mb-2 text-pink-400">{overview ? overview.riskScore : "--"}/10</div>
                <div className="text-sm text-gray-300 mb-4">This updates in real-time with simulation inputs.</div>

                <div className="bg-[rgba(255,255,255,0.01)] p-3 rounded">
                  <div className="text-xs text-gray-300">Export & Actions</div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={async ()=>{ const r = await axios.get(`${API_BASE}/api/export/report`); const blob = new Blob([JSON.stringify(r.data,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'report.json'; a.click(); }} className="px-3 py-2 bg-indigo-600 rounded">Download Report</button>
                    <button className="px-3 py-2 bg-gray-700 rounded">Emergency Call</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
