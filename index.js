const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- הגדרות טלגרם - שים כאן את הפרטים שקיבלת מה-BotFather ---
const TELEGRAM_TOKEN = '8598444559:AAGNxge2dQik-t614jAmDAAo7dpdvC7MLeQ';
const CHAT_ID = '5447811587';

// פונקציה לשליחת הודעה לטלגרם
const sendTelegramAlert = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, { chat_id: CHAT_ID, text: message });
    console.log("📱 Telegram Alert Sent!");
  } catch (e) {
    console.error("❌ Telegram Error:", e.message);
  }
};

// חיבור ל-MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// מודל נתונים כולל היסטוריה, יעד Sniper ומחיר חיצוני
const SkinSchema = new mongoose.Schema({
  name: String,
  price: { type: Number, default: 0 },
  targetPrice: { type: Number, default: 0 },
  externalPrice: { type: Number, default: 0 },
  priceHistory: [
    {
      price: Number,
      date: { type: Date, default: Date.now }
    }
  ],
  lastUpdated: { type: Date, default: Date.now }
});

const Skin = mongoose.model('Skin', SkinSchema);

// פונקציה לחישוב ממוצע נע פשוט (SMA)
// מחשבת ממוצע של ה-10 עדכונים האחרונים כדי לזהות מגמות
const calculateSMA = (history, period = 10) => {
  if (!history || history.length === 0) return 0;
  const recent = history.slice(-period);
  const sum = recent.reduce((acc, curr) => acc + curr.price, 0);
  return (sum / recent.length).toFixed(2);
};

// --- פונקציית עדכון אוטומטית (Background Sniper) ---
const updatePricesAutomatically = async () => {
  console.log("🕒 [Auto-Scan] Checking market prices...");
  try {
    const skins = await Skin.find();
    for (const skin of skins) {
      const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(skin.name)}`;
      
      try {
        const response = await axios.get(url);
        if (response.data && response.data.success) {
          const priceString = response.data.lowest_price || response.data.median_price || "0";
          const price = parseFloat(priceString.replace('$', '').replace(',', ''));
          const sma = calculateSMA(skin.priceHistory, 10);

          // 1. בדיקת Sniper (מחיר יעד)
          if (skin.targetPrice > 0 && price <= skin.targetPrice) {
            await sendTelegramAlert(`🎯 SNIPER HIT!\nסקין: ${skin.name}\nמחיר: $${price}\nמחיר יעד: $${skin.targetPrice}`);
          } 
          // 2. בדיקת צניחת מחיר חריגה (מתחת לממוצע הנע)
          else if (sma > 0 && price < sma * 0.95) {
            await sendTelegramAlert(`📉 PRICE DROP!\n${skin.name} צנח ל-$${price}\nהממוצע הנוכחי הוא $${sma}`);
          }

          await Skin.findByIdAndUpdate(skin._id, {
            $set: { price, lastUpdated: Date.now() },
            $push: { priceHistory: { price, date: Date.now() } }
          });
        }
        // השהיה למניעת חסימה מ-Steam
        await new Promise(r => setTimeout(r, 5000));
      } catch (err) { console.error(`Error with ${skin.name}`); }
    }
  } catch (err) { 
  console.error(`❌ Error with ${skin.name}: ${err.response?.status || err.message}`); 
}
};

// הרצה כל 5 דקות
setInterval(updatePricesAutomatically, 5 * 60 * 1000);

// --- API Routes ---

app.get('/api/tracked-skins', async (req, res) => {
  try {
    const skins = await Skin.find().sort({ lastUpdated: -1 });
    const results = skins.map(s => ({
      ...s._doc,
      sma: calculateSMA(s.priceHistory, 10)
    }));
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/track-skin', async (req, res) => {
  try {
    const { name } = req.body;
    const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(name)}`;
    const response = await axios.get(url);
    const priceString = response.data.lowest_price || "0";
    const price = parseFloat(priceString.replace('$', '').replace(',', ''));

    const updated = await Skin.findOneAndUpdate(
      { name },
      { $set: { price, lastUpdated: Date.now() }, $push: { priceHistory: { price } } },
      { upsert: true, new: true }
    );
    res.status(201).json(updated);
  } catch (err) { res.status(500).json({ error: "Steam API Error" }); }
});

app.patch('/api/update-data/:id', async (req, res) => {
  try {
    const { targetPrice, externalPrice } = req.body;
    const update = {};
    if (targetPrice !== undefined) update.targetPrice = Number(targetPrice);
    if (externalPrice !== undefined) update.externalPrice = Number(externalPrice);
    await Skin.findByIdAndUpdate(req.params.id, update);
    res.json({ message: "Updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/delete-skin/:id', async (req, res) => {
  await Skin.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sniper Server running on http://localhost:${PORT}`);
  updatePricesAutomatically(); // הרצה ראשונה מיד עם ההפעלה
});