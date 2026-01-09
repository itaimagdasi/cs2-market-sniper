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

  const fetchSkins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/tracked-skins`);
      setSkins(res.data);
      setSelectedSkin(prev => {
        if (!prev && res.data.length > 0) return res.data[0];
        if (prev) return res.data.find(s => s._id === prev._id) || prev;
        return prev;
      });
    } catch (err) { console.error("Fetch error:", err); }
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
    } catch (err) { alert("Check skin name."); }
    finally { setLoading(false); }
  };

  return (
    <div className="container">
      <header><h1>CS2 Market Sniper 🎯</h1></header>

      <div className="input-group">
        <input 
          value={newSkinName} 
          onChange={(e) => setNewSkinName(e.target.value)}
          placeholder="e.g. AK-47 | Redline (Minimal Wear)"
        />
        <button onClick={addSkin} disabled={loading}>{loading ? '...' : 'Add Skin'}</button>
      </div>

      <div className="dashboard-grid">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Icon</th><th>Name</th><th>Price</th><th>Target</th></tr>
            </thead>
            <tbody>
              {skins.map(skin => (
                <tr key={skin._id} onClick={() => setSelectedSkin(skin)} className={selectedSkin?._id === skin._id ? 'active-row' : ''}>
                  <td>
                    {skin.image ? (
                      <img 
                        src={skin.image} 
                        alt="" 
                        className="skin-icon" 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        /* אם התמונה נכשלת, אנחנו מדפיסים את הלינק לקונסול כדי שתוכל להעתיק אותו ולבדוק */
                        onError={(e) => {
                          console.log("❌ Image failed for:", skin.name, "URL:", skin.image);
                          e.target.style.display = 'none'; // מסתיר את האייקון השבור
                          e.target.nextSibling.style.display = 'block'; // מציג את האמוג'י במקום
                        }}
                      />
                    ) : null}
                    <div className="fallback-emoji" style={{ display: 'none', fontSize: '24px' }}>🔫</div>
                  </td>
                  <td>{skin.name}</td>
                  <td style={{ color: '#4caf50' }}>${skin.price?.toFixed(2)}</td>
                  <td>{skin.targetPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-container">
          <h3>Trend: {selectedSkin?.name}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={selectedSkin?.priceHistory || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" hide />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a' }} />
              <Line type="monotone" dataKey="price" stroke="#4caf50" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;