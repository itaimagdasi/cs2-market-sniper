import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import './App.css';

const API_URL = 'https://cs2-market-sniper.onrender.com/api';

function App() {
  const [skins, setSkins] = useState([]);
  const [newSkinName, setNewSkinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState(null);

  const fetchSkins = async () => {
    try {
      const res = await axios.get(`${API_URL}/tracked-skins`);
      setSkins(res.data);
      if (res.data.length > 0 && !selectedSkin) {
        setSelectedSkin(res.data[0]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchSkins();
    const interval = setInterval(fetchSkins, 30000);
    return () => clearInterval(interval);
  }, []);

  const addSkin = async () => {
    if (!newSkinName) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/track-skin`, { name: newSkinName });
      setNewSkinName('');
      setTimeout(fetchSkins, 3000);
    } catch (err) {
      alert("Error: Skin name might be incorrect or server is down.");
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
    try {
      await axios.delete(`${API_URL}/delete-skin/${id}`);
      fetchSkins();
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

      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowGuide(false)}>&times;</button>
            <h2>📖 User Guide</h2>
            <div className="guide-step">
              <h4>1. Add a Skin</h4>
              <p>Enter the exact name from Steam (e.g., AK-47 | Redline (Field-Tested)). The system will scan the price immediately.</p>
            </div>
            <div className="guide-step">
              <h4>2. Set Target Price</h4>
              <p>Define your sniper target. When the market price drops below this value, you'll receive a Telegram alert.</p>
            </div>
            <div className="guide-step">
              <h4>3. SMA Analysis</h4>
              <p>The chart shows a Simple Moving Average (SMA). If the price is significantly below the orange line, it may indicate a price drop.</p>
            </div>
          </div>
        </div>
      )}

      <div className="input-group">
        <input 
          value={newSkinName} 
          onChange={(e) => setNewSkinName(e.target.value)}
          placeholder="e.g. Glock-18 | Candy Apple (Factory New)"
        />
        <button onClick={addSkin} disabled={loading}>
          {loading ? 'Scanning...' : 'Add Skin'}
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Skin Name</th>
                <th>Market Price</th>
                <th>Target Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {skins.map(skin => (
                <tr key={skin._id} onClick={() => setSelectedSkin(skin)} className={selectedSkin?._id === skin._id ? 'active-row' : ''}>
                  <td>{skin.name}</td>
                  <td>${skin.price?.toFixed(2)}</td>
                  <td>
                    <input 
                      type="number" 
                      defaultValue={skin.targetPrice} 
                      onBlur={(e) => updateTarget(skin._id, e.target.value)}
                    />
                  </td>
                  <td>
                    <button className="delete-btn" onClick={() => deleteSkin(skin._id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-container">
          <h3>Trend Analysis: {selectedSkin?.name || 'Select a skin'}</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={selectedSkin?.priceHistory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                <Legend />
                <Line type="monotone" dataKey="price" name="Market Price ($)" stroke="#4caf50" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sma" name="SMA (Trend)" stroke="#ff9800" strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;