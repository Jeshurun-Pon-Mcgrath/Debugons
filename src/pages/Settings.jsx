import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setMessage("❌ Failed to load settings");
        setLoading(false);
      });
  }, []);

  const handleChange = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const saveSettings = () => {
    if (!settings) return;
    setSaving(true);
    fetch("http://localhost:5000/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
      .then((res) => res.json())
      .then(() => {
        setMessage("✅ Settings saved successfully!");
        setSaving(false);
      })
      .catch(() => {
        setMessage("❌ Failed to save settings");
        setSaving(false);
      });
  };

  if (loading) {
    return (
      <p className="text-center text-gray-400 animate-pulse">
        Loading settings...
      </p>
    );
  }

  if (!settings) {
    return <p className="text-center text-red-400">⚠️ No settings loaded</p>;
  }

  return (
    <div className="p-6 text-white">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6"
      >
        ⚙️ Settings
      </motion.h1>

      {/* Profile Section */}
      <div className="bg-gray-900 p-5 rounded-2xl mb-6 shadow-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-3">👤 Profile</h2>
        <input
          type="text"
          className="w-full p-2 mb-3 rounded bg-gray-800"
          value={settings?.profile?.name || ""}
          onChange={(e) => handleChange("profile", "name", e.target.value)}
          placeholder="Your name"
        />
        <input
          type="email"
          className="w-full p-2 rounded bg-gray-800"
          value={settings?.profile?.email || ""}
          onChange={(e) => handleChange("profile", "email", e.target.value)}
          placeholder="Email address"
        />
      </div>

      {/* Preferences */}
      <div className="bg-gray-900 p-5 rounded-2xl mb-6 shadow-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-3">⚡ Preferences</h2>
        <label className="block mb-2">
          Refresh Interval (sec):
          <input
            type="number"
            className="w-24 ml-2 p-1 rounded bg-gray-800"
            value={settings?.preferences?.refreshInterval || 0}
            onChange={(e) =>
              handleChange(
                "preferences",
                "refreshInterval",
                Number(e.target.value)
              )
            }
          />
        </label>
        <label className="block">
          Theme:
          <select
            className="ml-2 p-2 rounded bg-gray-800"
            value={settings?.preferences?.theme || "dark"}
            onChange={(e) =>
              handleChange("preferences", "theme", e.target.value)
            }
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="neon">Futuristic Neon</option>
          </select>
        </label>
      </div>

      {/* Alerts */}
      <div className="bg-gray-900 p-5 rounded-2xl mb-6 shadow-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-3">🚨 Alert Config</h2>
        <label className="block mb-2">
          Vibration Threshold (Hz):
          <input
            type="number"
            className="w-24 ml-2 p-1 rounded bg-gray-800"
            value={settings?.alerts?.vibrationThreshold || 0}
            onChange={(e) =>
              handleChange("alerts", "vibrationThreshold", Number(e.target.value))
            }
          />
        </label>
        <label className="block">
          <input
            type="checkbox"
            className="mr-2"
            checked={settings?.alerts?.notifyEmail || false}
            onChange={(e) =>
              handleChange("alerts", "notifyEmail", e.target.checked)
            }
          />
          Email Alerts
        </label>
      </div>

      {/* AI Settings */}
      <div className="bg-gray-900 p-5 rounded-2xl mb-6 shadow-xl border border-gray-700">
        <h2 className="text-xl font-semibold mb-3">🤖 AI Settings</h2>
        <label>
          Sensitivity:
          <select
            className="ml-2 p-2 rounded bg-gray-800"
            value={settings?.ai?.sensitivity || "balanced"}
            onChange={(e) => handleChange("ai", "sensitivity", e.target.value)}
          >
            <option value="conservative">Conservative</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        disabled={saving}
        className={`px-6 py-2 rounded-lg font-bold shadow-lg ${
          saving ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-500"
        }`}
        onClick={saveSettings}
      >
        {saving ? "💾 Saving..." : "💾 Save Settings"}
      </motion.button>

      {message && <p className="mt-4 text-center text-sm">{message}</p>}
    </div>
  );
}
