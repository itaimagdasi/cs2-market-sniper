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
const sendTelegramAlert = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, { chat_id: CHAT_ID, text: message });
    console.log("📱 Telegram Alert Sent!");
  } catch (e) {
    console.error("❌ Telegram Error: " + e.message);
  }
};

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error: ' + err));

const SkinSchema = new mongoose.Schema({
  name: String,
  price: { type: Number, default: 0 },
  targetPrice: { type: Number, default: 0 },
  priceHistory: [{ price: Number, date: { type: Date, default: Date.now } }],
  lastUpdated: { type: Date, default: Date.now }
});

const Skin = mongoose.model('Skin', SkinSchema);

const calculateSMA = (history, period = 10) => {
  if (!history || history.length === 0) return 0;
  const recent = history.slice(-period);
  const sum = recent.reduce((acc, curr) => acc + curr.price, 0);
  return (sum / recent.length).toFixed(2);
};

// פונקציית עדכון באמצעות Skinport API - הרבה יותר יציב לשרתים
const updatePricesAutomatically = async () => {
  console.log("🕒 [Auto-Scan] Fetching prices from Skinport API...");
  try {
    const response = await axios.get('https://api.skinport.com/v1/items?app_id=730&currency=USD', {
      headers: { 'Accept-Encoding': 'gzip' } // אופטימיזציה להורדה מהירה
    });

    const allPrices = response.data; // Skinport מחזירה מערך (Array)
    const skins = await Skin.find();

    for (const skin of skins) {
      // חיפוש הסקין בתוך המערך הגדול שחזר מה-API
      const itemData = allPrices.find(i => i.market_hash_name === skin.name);
      
      if (itemData && itemData.min_price) {
        const price = itemData.min_price;
        const sma = calculateSMA(skin.priceHistory, 10);

        if (skin.targetPrice > 0 && price <= skin.targetPrice) {
          await sendTelegramAlert(`🎯 SNIPER HIT!\nItem: ${skin.name}\nPrice: $${price}\nTarget: $${skin.targetPrice}`);
        }

        await Skin.findByIdAndUpdate(skin._id, {
          $set: { price, lastUpdated: Date.now() },
          $push: { priceHistory: { price, date: Date.now() } }
        });
        console.log(`✅ Updated: ${skin.name} to $${price}`);
      } else {
        console.log(`⚠️ No price found for: ${skin.name}`);
      }
    }
  } catch (err) {
    console.error(`❌ API Error: ${err.message}`);
  }
};

setInterval(updatePricesAutomatically, 15 * 60 * 1000); // עדכון כל 15 דקות

app.get('/api/tracked-skins', async (req, res) => {
  try {
    const skins = await Skin.find().sort({ lastUpdated: -1 });
    const results = skins.map(s => ({ ...s._doc, sma: calculateSMA(s.priceHistory, 10) }));
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/track-skin', async (req, res) => {
  try {
    const { name } = req.body;
    const newSkin = await Skin.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    res.status(201).json(newSkin);
    updatePricesAutomatically(); 
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/update-data/:id', async (req, res) => {
  try {
    const { targetPrice } = req.body;
    await Skin.findByIdAndUpdate(req.params.id, { targetPrice: Number(targetPrice) });
    res.json({ message: "Updated" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/delete-skin/:id', async (req, res) => {
  try {
    await Skin.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  setTimeout(updatePricesAutomatically, 5000); 
});