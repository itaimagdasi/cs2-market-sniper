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

// חיבור ל-MongoDB
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

// חישוב ממוצע נע (SMA)
const calculateSMA = (history, period = 10) => {
  if (!history || history.length === 0) return 0;
  const recent = history.slice(-period);
  const sum = recent.reduce((acc, curr) => acc + curr.price, 0);
  return (sum / recent.length).toFixed(2);
};

// --- פונקציית עדכון אוטומטית באמצעות CSGOBackpack (מונע חסימות) ---
const updatePricesAutomatically = async () => {
  console.log("🕒 [Auto-Scan] Fetching global price list from CSGOBackpack...");
  try {
    // משיכת כל המחירים בבקשה אחת בלבד
    const response = await axios.get('https://csgobackpack.net/api/GetItemPriceList/v2/');
    if (!response.data || !response.data.success) {
      console.log("⚠️ API check failed, will retry in the next cycle.");
      return;
    }

    const allPrices = response.data.items_list;
    const skins = await Skin.find();

    for (const skin of skins) {
      const itemData = allPrices[skin.name];
      
      if (itemData && itemData.price && itemData.price["24_hours"]) {
        const price = parseFloat(itemData.price["24_hours"].average);
        const sma = calculateSMA(skin.priceHistory, 10);

        // בדיקת Sniper
        if (skin.targetPrice > 0 && price <= skin.targetPrice) {
          await sendTelegramAlert(`🎯 SNIPER HIT!\nנשק: ${skin.name}\nמחיר: $${price}\nיעד: $${skin.targetPrice}`);
        } 
        // בדיקת צניחה מתחת לממוצע הנע
        else if (sma > 0 && price < sma * 0.95) {
          await sendTelegramAlert(`📉 PRICE DROP!\n${skin.name} צנח ל-$${price}\nממוצע: $${sma}`);
        }

        await Skin.findByIdAndUpdate(skin._id, {
          $set: { price, lastUpdated: Date.now() },
          $push: { priceHistory: { price, date: Date.now() } }
        });
        console.log(`✅ Updated: ${skin.name} -> $${price}`);
      } else {
        console.log(`⚠️ No price data for: ${skin.name}`);
      }
    }
  } catch (err) {
    console.error("❌ API Update Error:", err.message);
  }
};

// הרצה כל 10 דקות (בטוח ויציב)
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
    // בהוספה ראשונית אנחנו רק שומרים את השם, הסריקה הבאה תביא את המחיר
    const newSkin = await Skin.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true }
    );
    res.status(201).json(newSkin);
  } catch (err) { res.status(500).json({ error: err.message }); }
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sniper Server running on port ${PORT}`);
  // הרצה מיידית עם העלייה
  setTimeout(updatePricesAutomatically, 5000); 
});