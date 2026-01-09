import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// --- הגדרות טלגרם - שים כאן את הפרטים שקיבלת מה-BotFather ---
const TELEGRAM_TOKEN = '8598444559:AAGNxge2dQik-t614jAmDAAo7dpdvC7MLeQ';
const CHAT_ID = '5447811587';
const MONGO_URI = process.env.MONGO_URI;
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

// חיבור ל-MongoDB - המערכת כבר אישרה חיבור תקין
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const SkinSchema = new mongoose.Schema({
  name: String,
  price: { type: Number, default: 0 },
  targetPrice: { type: Number, default: 0 },
  externalPrice: { type: Number, default: 0 },
  priceHistory: [{ price: Number, date: { type: Date, default: Date.now } }],
  lastUpdated: { type: Date, default: Date.now }
});

const Skin = mongoose.model('Skin', SkinSchema);

// חישוב ממוצע נע (SMA) לפי הנוסחה: SMA = (1/n) * sum(Pi)
const calculateSMA = (history, period = 10) => {
  if (!history || history.length === 0) return 0;
  const recent = history.slice(-period);
  const sum = recent.reduce((acc, curr) => acc + curr.price, 0);
  return (sum / recent.length).toFixed(2);
};

// פונקציית עדכון אוטומטית - כוללת User-Agent למניעת שגיאת 403
const updatePricesAutomatically = async () => {
  console.log("🕒 [Auto-Scan] Fetching global price list from CSGOBackpack...");
  try {
    const response = await axios.get('https://csgobackpack.net/api/GetItemPriceList/v2/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.data || !response.data.success) {
      console.log("⚠️ API check failed, success flag is false.");
      return;
    }

    const allPrices = response.data.items_list;
    const skins = await Skin.find();

    for (const skin of skins) {
      const itemData = allPrices[skin.name];
      
      if (itemData && itemData.price && itemData.price["24_hours"]) {
        const price = parseFloat(itemData.price["24_hours"].average);
        const sma = calculateSMA(skin.priceHistory, 10);

        // בדיקת Sniper והתראות
        if (skin.targetPrice > 0 && price <= skin.targetPrice) {
          await sendTelegramAlert(`🎯 SNIPER HIT!\n${skin.name}\nמחיר נוכחי: $${price}\nמחיר יעד: $${skin.targetPrice}`);
        }

        await Skin.findByIdAndUpdate(skin._id, {
          $set: { price, lastUpdated: Date.now() },
          $push: { priceHistory: { price, date: Date.now() } }
        });
        console.log(`✅ Updated: ${skin.name} to $${price}`);
      } else {
        console.log(`⚠️ Price data missing for: ${skin.name}`);
      }
    }
  } catch (err) {
    console.error(`❌ API Update Error: ${err.response?.status || err.message}`);
  }
};

// סריקה כל 10 דקות
setInterval(updatePricesAutomatically, 10 * 60 * 1000);

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
    console.log(`📩 Request to add skin: ${name}`);
    const newSkin = await Skin.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true }
    );
    res.status(201).json(newSkin);
  } catch (err) { 
    console.error("❌ DB Error during track-skin:", err.message);
    res.status(500).json({ error: err.message }); 
  }
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

// שימוש בפורט ש-Render מקצה או ב-10000 כברירת מחדל
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Sniper Server running on port ${PORT}`);
  // סריקה ראשונית 10 שניות אחרי העלייה
  setTimeout(updatePricesAutomatically, 10000); 
});