import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import './App.css';

// Your Render Backend URL
const API_URL = 'https://cs2-market-sniper.onrender.com/api';

function App() {
  const [skins, setSkins] = useState([]);
  const [newSkinName, setNewSkinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState(null);

  // Fetch all skins from the Database
  const fetchSkins = async () => {
    try {
      const res = await axios.get(`${API_URL}/tracked-skins`);
      setSkins(res.data);
      // Automatically select the first skin if none is selected
      if (res.data.length > 0 && !selectedSkin) {
        setSelectedSkin(res.data[0]);
      } else if (selectedSkin) {
        // Keep the selected skin updated with fresh data
        const updated = res.data.find(s => s._id === selectedSkin._id);
        if (updated) setSelectedSkin(updated);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchSkins();
    const interval = setInterval(fetchSkins, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [selectedSkin]);

  const addSkin = async () => {
    if (!newSkinName) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/track-skin`, { name: newSkinName });
      setNewSkinName('');
      setTimeout(fetchSkins, 3000);
    } catch (err) {
      alert("Error: Check skin name or server connection.");
    } finally {
      setLoading(false);
    }
  };

  const updateTarget = async (id, targetPrice) => {
    try {
      await axios.patch(`${API_URL}/update-data/${id}`, { targetPrice });
      fetchSkins();
    } catch (err) { console.error(err); }
  };

  const deleteSkin = async (id) => {
    if (!window.confirm("Delete this skin from tracking?")) return;
    try {
      await axios.delete(`${API_URL}/delete-skin/${id}`);
      setSkins(skins.filter(s => s._id !== id));
      if (selectedSkin?._id === id) setSelectedSkin(null);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="container">
      <header>
        <h1>CS2 Market Sniper 🎯</h1>
        <button className="help-icon-btn" onClick={() => setShowGuide(true)}>
          ❓ How it works?
        </button>
      </header>

      {/* User Guide Modal */}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowGuide(false)}>&times;</button>
            <h2>📖 CS2 Sniper Guide</h2>
            <div className="guide-step">
              <h4>1. Track Skins</h4>
              <p>Enter the exact name (e.g., AK-47 | Redline (Field-Tested)). The system scans market prices every 10 minutes.</p>
            </div>
            <div className="guide-step">
              <h4>2. Set Your Sniper Target</h4>
              <p>Define a "Target Price". You'll get a Telegram alert the moment it drops below this value.</p>
            </div>
            <div className="guide-step">
              <h4>3. SMA Trend Analysis</h4>
              <p>The chart shows the Simple Moving Average (SMA). If the price is below the orange line, it's a potential buy signal.</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="input-group">
        <input 
          value={newSkinName} 
          onChange={(e) => setNewSkinName(e.target.value)}
          placeholder="Enter skin name (e.g. AWP | Asiimov (Field-Tested))"
        />
        <button onClick={addSkin} disabled={loading}>
          {loading ? 'Scanning...' : 'Add to Sniper'}
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Market Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Skin Name</th>
                <th>Price ($)</th>
                <th>Target ($)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {skins.map(skin => (
                <tr 
                  key={skin._id} 
                  onClick={() => setSelectedSkin(skin)} 
                  className={selectedSkin?._id === skin._id ? 'active-row' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: '600' }}>{skin.name}</td>
                  <td style={{ color: '#4caf50' }}>${skin.price?.toFixed(2)}</td>
                  <td>
                    <input 
                      type="number" 
                      className="target-input"
                      defaultValue={skin.targetPrice} 
                      onBlur={(e) => updateTarget(skin._id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteSkin(skin._id); }}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Analytics Chart */}
        <div className="chart-container">
          <h3 style={{ marginBottom: '20px' }}>
            Analysis: {selectedSkin?.name || 'Select a skin'}
          </h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={selectedSkin?.priceHistory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '8px' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  name="Market Price" 
                  stroke="#4caf50" 
                  strokeWidth={3} 
                  dot={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="sma" 
                  name="SMA (Trend)" 
                  stroke="#ff9800" 
                  strokeDasharray="5 5" 
                  dot={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;