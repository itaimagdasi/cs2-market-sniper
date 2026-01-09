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
// Telegram Alert Logic
const sendTelegramAlert = async (message) => {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, { chat_id: CHAT_ID, text: message });
    console.log("📱 Telegram Alert Sent!");
  } catch (e) {
    console.error("❌ Telegram Error: " + e.message);
  }
};

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error: ' + err));

// Database Schema
const SkinSchema = new mongoose.Schema({
  name: String,
  price: { type: Number, default: 0 },
  targetPrice: { type: Number, default: 0 },
  priceHistory: [{ price: Number, date: { type: Date, default: Date.now } }],
  lastUpdated: { type: Date, default: Date.now }
});

const Skin = mongoose.model('Skin', SkinSchema);

// Statistical Logic: Simple Moving Average (SMA)
const calculateSMA = (history, period = 10) => {
  if (!history || history.length === 0) return 0;
  const recent = history.slice(-period);
  const sum = recent.reduce((acc, curr) => acc + curr.price, 0);
  return (sum / recent.length).toFixed(2);
};

// Core Scanner Logic - Skinport API Implementation
const updatePricesAutomatically = async () => {
  console.log("🕒 [Auto-Scan] Fetching prices from Skinport API...");
  try {
    const response = await axios.get('https://api.skinport.com/v1/items?app_id=730&currency=USD', {
      headers: {
        'Accept': 'application/json', // CRITICAL: Fixes 406 error
        'Accept-Encoding': 'gzip',
        'User-Agent': 'CS2-Market-Sniper-V2'
      }
    });

    if (response.data && Array.isArray(response.data)) {
      const allItems = response.data;
      const skins = await Skin.find();

      for (const skin of skins) {
        // Find matching skin in the Skinport array
        const itemData = allItems.find(i => i.market_hash_name === skin.name);
        
        if (itemData && itemData.min_price) {
          const price = itemData.min_price;

          // Alert Logic
          if (skin.targetPrice > 0 && price <= skin.targetPrice) {
            await sendTelegramAlert(`🎯 SNIPER HIT!\nItem: ${skin.name}\nPrice: $${price}\nTarget: $${skin.targetPrice}`);
          }

          // Update Database
          await Skin.findByIdAndUpdate(skin._id, {
            $set: { price, lastUpdated: Date.now() },
            $push: { priceHistory: { price, date: Date.now() } }
          });
          console.log(`✅ Updated: ${skin.name} to $${price}`);
        }
      }
    }
  } catch (err) {
    // Handle 403 or 406 errors by logging clear messages
    console.error(`❌ API Error: ${err.response?.status || err.message}`);
  }
};

// Run scan every 10 minutes
setInterval(updatePricesAutomatically, 10 * 60 * 1000);

// --- API ROUTES ---

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
    // Trigger immediate scan when adding new skin
    console.log(`🚀 Adding ${name}... Scanning price now.`);
    updatePricesAutomatically(); 
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/update-data/:id', async (req, res) => {
  try {
    const { targetPrice } = req.body;
    await Skin.findByIdAndUpdate(req.params.id, { targetPrice: Number(targetPrice) });
    res.json({ message: "Target updated" });
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
  console.log(`🚀 Sniper Server running on port ${PORT}`);
  // Initial scan 5 seconds after startup
  setTimeout(updatePricesAutomatically, 5000); 
});