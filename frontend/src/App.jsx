import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// הכתובת החדשה של השרת שלך ב-Render
const API_URL = "https://cs2-market-sniper.onrender.com";

const styles = {
  container: { backgroundColor: '#121212', color: 'white', minHeight: '100vh', padding: '20px', direction: 'rtl', fontFamily: 'Arial' },
  card: { backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' },
  summaryCard: { display: 'flex', justifyContent: 'space-around', padding: '15px', backgroundColor: '#252525', borderRadius: '10px', marginBottom: '20px', border: '1px solid #333' },
  stat: { textAlign: 'center' },
  statValue: { fontSize: '1.4em', fontWeight: 'bold', color: '#4caf50', display: 'block' },
  input: { padding: '8px', borderRadius: '5px', width: '90%', backgroundColor: '#333', color: 'white', border: '1px solid #555', textAlign: 'center' },
  btn: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
  th: { padding: '15px 5px', borderBottom: '2px solid #333', color: '#888', fontWeight: 'bold', textAlign: 'right' },
  td: { padding: '15px 5px', borderBottom: '1px solid #333', textAlign: 'right' },
  profit: { color: '#00ff00', fontWeight: 'bold' },
  loss: { color: '#ff4444' },
  sniperRow: { backgroundColor: 'rgba(76, 175, 80, 0.1)' }
};

function App() {
  const [skins, setSkins] = useState([]);
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  // משיכת נתונים מהשרת בענן
  const fetchSkins = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/tracked-skins`);
      setSkins(res.data);
    } catch (e) {
      console.error("שגיאה במשיכת נתונים מהשרת:", e);
    }
  };

  useEffect(() => {
    fetchSkins();
    // רענון אוטומטי כל 15 שניות
    const interval = setInterval(fetchSkins, 15000);
    return () => clearInterval(interval);
  }, []);

  // חישוב נתוני הפורטפוליו
  const totalValue = skins.reduce((acc, s) => acc + s.price, 0);
  const totalPotentialProfit = skins.reduce((acc, s) => {
    const net = s.price * 0.85;
    return acc + (s.externalPrice > 0 ? (net - s.externalPrice) : 0);
  }, 0);

  // עדכון מחיר יעד או מחיר חיצוני
  const updateData = async (id, field, value) => {
    try {
      await axios.patch(`${API_URL}/api/update-data/${id}`, { [field]: value });
      fetchSkins();
    } catch (e) {
      console.error("שגיאה בעדכון הנתונים:", e);
    }
  };

  // הוספת סקין חדש
  const addSkin = async () => {
    if (!name) return;
    try {
      await axios.post(`${API_URL}/api/track-skin`, { name });
      setName('');
      fetchSkins();
    } catch (e) {
      alert("שגיאה: ייתכן והסקין לא נמצא ב-Steam או שיש עומס על ה-API");
    }
  };

  const currentSkin = skins.find(s => s._id === selectedId);

  return (
    <div style={styles.container}>
      <h1 style={{ textAlign: 'center', color: '#4caf50', marginBottom: '30px' }}>🎯 CS2 Market Sniper (Cloud Edition)</h1>

      {/* סיכום פורטפוליו */}
      <div style={styles.summaryCard}>
        <div style={styles.stat}>
          <span style={{ color: '#888' }}>שווי שוק כולל</span>
          <span style={styles.statValue}>${totalValue.toFixed(2)}</span>
        </div>
        <div style={styles.stat}>
          <span style={{ color: '#888' }}>פוטנציאל רווח (נקי)</span>
          <span style={{ ...styles.statValue, color: totalPotentialProfit > 0 ? '#00ff00' : '#888' }}>
            ${totalPotentialProfit.toFixed(2)}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={{ color: '#888' }}>סקינים במעקב</span>
          <span style={{ ...styles.statValue, color: '#2196f3' }}>{skins.length}</span>
        </div>
      </div>

      <div style={styles.card}>
        <input 
          style={{ padding: '12px', borderRadius: '6px', width: '350px', backgroundColor: '#2a2a2a', color: 'white', border: '1px solid #444', marginLeft: '15px', textAlign: 'right' }} 
          value={name} 
          onChange={e => setName(e.target.value)} 
          placeholder="הכנס שם סקין מלא (למשל: AK-47 | Slate (Field-Tested))" 
        />
        <button style={styles.btn} onClick={addSkin}>הוסף למעקב</button>
      </div>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '25%' }}>סקין</th>
              <th style={{ ...styles.th, width: '15%' }}>מחיר Steam</th>
              <th style={{ ...styles.th, width: '15%' }}>מחיר קנייה (חוץ)</th>
              <th style={{ ...styles.th, width: '20%' }}>רווח (נקי)</th>
              <th style={{ ...styles.th, width: '15%' }}>יעד Sniper</th>
              <th style={{ ...styles.th, width: '10%' }}>מחיקה</th>
            </tr>
          </thead>
          <tbody>
            {skins.map(s => {
              const net = s.price * 0.85;
              const profit = s.externalPrice > 0 ? (net - s.externalPrice) : 0;
              const isHit = s.targetPrice > 0 && s.price <= s.targetPrice;

              return (
                <tr key={s._id} style={isHit ? styles.sniperRow : {}}>
                  <td style={{ ...styles.td, color: '#4caf50', cursor: 'pointer', fontWeight: selectedId === s._id ? 'bold' : 'normal' }} onClick={() => setSelectedId(s._id)}>{s.name}</td>
                  <td style={styles.td}>${s.price.toFixed(2)}</td>
                  <td style={styles.td}>
                    <input type="number" style={styles.input} defaultValue={s.externalPrice || ''} onBlur={(e) => updateData(s._id, 'externalPrice', e.target.value)} />
                  </td>
                  <td style={styles.td}>
                    {profit !== 0 ? <span style={profit > 0 ? styles.profit : styles.loss}>${profit.toFixed(2)}</span> : '---'}
                  </td>
                  <td style={styles.td}>
                    <input type="number" style={styles.input} defaultValue={s.targetPrice || ''} onBlur={(e) => updateData(s._id, 'targetPrice', e.target.value)} />
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => axios.delete(`${API_URL}/api/delete-skin/${s._id}`).then(fetchSkins)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentSkin && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: '20px' }}>ניתוח מגמות: {currentSkin.name}</h3>
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentSkin.priceHistory}>
                <CartesianGrid stroke="#333" vertical={false} />
                <XAxis dataKey="date" tickFormatter={t => new Date(t).toLocaleTimeString()} stroke="#888" fontSize={10} />
                <YAxis stroke="#888" domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: '#222', border: 'none', color: '#fff' }} />
                <Legend verticalAlign="top" height={36}/>
                <Line name="מחיר שוק ($)" type="monotone" dataKey="price" stroke="#4caf50" strokeWidth={3} dot={false} />
                <Line name="ממוצע (SMA)" type="monotone" dataKey="price" stroke="#ff9800" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;