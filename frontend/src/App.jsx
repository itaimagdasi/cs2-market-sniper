import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import './App.css';

// וודא שזו הכתובת המדויקת של ה-Backend שלך ב-Render
const API_URL = 'https://cs2-market-sniper.onrender.com/api';

function App() {
  const [skins, setSkins] = useState([]);
  const [newSkinName, setNewSkinName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState(null);

  // טעינת סקינים מה-Database
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
    const interval = setInterval(fetchSkins, 30000); // רענון אוטומטי כל 30 שניות
    return () => clearInterval(interval);
  }, []);

  // הוספת סקין חדש - מפעיל סריקה מיידית בשרת
  const addSkin = async () => {
    if (!newSkinName) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/track-skin`, { name: newSkinName });
      setNewSkinName('');
      setTimeout(fetchSkins, 3000); // המתנה קלה לעדכון המחיר בשרת
    } catch (err) {
      alert("שגיאה: ייתכן והשם לא מדויק או שיש בעיית חיבור לשרת");
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
          ❓ איך זה עובד?
        </button>
      </header>

      {/* מדריך למשתמש (Modal) */}
      {showGuide && (
        <div className="modal-overlay" onClick={() => setShowGuide(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowGuide(false)}>&times;</button>
            <h2>📖 מדריך למשתמש</h2>
            <div className="guide-step">
              <h4>1. הוספת סקין</h4>
              <p>העתק את השם המדויק מ-Steam. המערכת תבצע סריקה מיידית ותעדכן את המחיר.</p>
            </div>
            <div className="guide-step">
              <h4>2. יעד ה-Sniper</h4>
              <p>הגדר מחיר מטרה. ברגע שמחיר השוק יירד מתחתיו, תקבל הודעה לטלגרם.</p>
            </div>
            <div className="guide-step">
              <h4>3. ניתוח SMA</h4>
              <p>הגרף מציג ממוצע נע (SMA). אם המחיר מתחת לקו הכתום, ייתכן שיש ירידת מחיר חריגה.</p>
            </div>
          </div>
        </div>
      )}

      <div className="input-group">
        <input 
          value={newSkinName} 
          onChange={(e) => setNewSkinName(e.target.value)}
          placeholder="למשל: AK-47 | Redline (Field-Tested)"
        />
        <button onClick={addSkin} disabled={loading}>
          {loading ? 'סורק...' : 'הוסף למעקב'}
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>סקין</th>
                <th>מחיר Steam</th>
                <th>יעד Sniper</th>
                <th>פעולות</th>
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
          <h3>ניתוח מגמות: {selectedSkin?.name}</h3>
          {/* פתרון בעיית הגובה של ה-Recharts */}
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={selectedSkin?.priceHistory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" hide />
                <YAxis domain={['auto', 'auto']} stroke="#ccc" />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  name="מחיר שוק ($)" 
                  stroke="#4caf50" 
                  strokeWidth={2} 
                  dot={false}
                />
                {/* הצגת הממוצע הנע בגרף */}
                <Line 
                  type="monotone" 
                  dataKey="sma" 
                  name="ממוצע נע (SMA)" 
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