import React, { useState, useEffect, useCallback } from 'react';
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
  const [selectedSkin, setSelectedSkin] = useState(null);

  // פונקציית עזר לחישוב ממוצע נע (SMA) על בסיס 5 דגימות אחרונות
  const addSMAData = (history) => {
    if (!history) return [];
    return history.map((point, index) => {
      const start = Math.max(0, index - 4); // ממוצע של 5 נקודות
      const subset = history.slice(start, index + 1);
      const avg = subset.reduce((acc, curr) => acc + curr.price, 0) / subset.length;
      return { ...point, sma: avg.toFixed(2) };
    });
  };

  const fetchSkins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/tracked-skins`);
      const data = res.data;
      setSkins(data);
      
      setSelectedSkin(prev => {
        const current = prev ? data.find(s => s._id === prev._id) : data[0];
        if (current) {
          // חישוב ה-SMA לפני הצגה בגרף
          return { ...current, priceHistory: addSMAData(current.priceHistory) };
        }
        return null;
      });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchSkins();
    const interval = setInterval(fetchSkins, 30000);
    return () => clearInterval(interval);
  }, [fetchSkins]);

  const addSkin = async () => {
    if (!newSkinName) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/track-skin`, { name: newSkinName });
      setNewSkinName('');
      setTimeout(fetchSkins, 3000);
    } catch (err) { alert("Check name"); }
    finally { setLoading(false); }
  };

  const updateTarget = async (id, targetPrice) => {
    try {
      await axios.patch(`${API_URL}/update-data/${id}`, { targetPrice });
      fetchSkins();
    } catch (err) { console.error(err); }
  };

  const deleteSkin = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await axios.delete(`${API_URL}/delete-skin/${id}`);
      setSkins(prev => prev.filter(s => s._id !== id));
      if (selectedSkin?._id === id) setSelectedSkin(null);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="container">
      <header><h1>CS2 Market Sniper 🎯</h1></header>

      <div className="input-group">
        <input 
          value={newSkinName} 
          onChange={(e) => setNewSkinName(e.target.value)}
          placeholder="e.g. M4A1-S | Printstream (Field-Tested)"
        />
        <button onClick={addSkin} disabled={loading}>{loading ? '...' : 'Add Skin'}</button>
      </div>

      <div className="dashboard-grid">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Icon</th><th>Name</th><th>Price</th><th>Target</th><th>Action</th></tr>
            </thead>
            <tbody>
              {skins.map(skin => (
                <tr key={skin._id} onClick={() => setSelectedSkin({ ...skin, priceHistory: addSMAData(skin.priceHistory) })} className={selectedSkin?._id === skin._id ? 'active-row' : ''}>
                  <td><div className="skin-icon-static">🔫</div></td>
                  <td style={{ fontWeight: '600' }}>{skin.name}</td>
                  <td style={{ color: '#4caf50', fontWeight: 'bold' }}>
                    {skin.price > 0 ? `$${skin.price.toFixed(2)}` : '$---'}
                  </td>
                  <td>
                    <input 
                      type="number" 
                      className="target-input"
                      defaultValue={skin.targetPrice} 
                      onBlur={(e) => updateTarget(skin._id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td><button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteSkin(skin._id); }}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-container">
          <h3>Trend: {selectedSkin?.name || 'Select a skin'}</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={selectedSkin?.priceHistory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }} />
                <Legend verticalAlign="top" height={36}/>
                <Line type="monotone" dataKey="price" name="Price ($)" stroke="#4caf50" strokeWidth={3} dot={{ r: 4 }} />
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