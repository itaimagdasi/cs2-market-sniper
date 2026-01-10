const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const TelegramBot = require('node-telegram-bot-api');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// הגדרת בוט הטלגרם - polling: false כי אנחנו רק שולחים הודעות
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });

const MONGO_URI = process.env.MONGO_URI;
let isScanning = false;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Error: ' + err));

// מודל הנתונים
const SkinSchema = new mongoose.Schema({
  name: String,
  image: String, 
  price: { type: Number, default: 0 },
  targetPrice: { type: Number, default: 0 },
  priceHistory: [{ price: Number, date: { type: Date, default: Date.now } }],
  lastUpdated: { type: Date, default: Date.now }
});

const Skin = mongoose.model('Skin', SkinSchema);

// פונקציית הסריקה וההתראות
const updatePricesAutomatically = async () => {
  if (isScanning) return;
  isScanning = true;
  console.log("🕒 [Safe-Scan] Checking prices and Telegram alerts...");

  try {
    const response = await axios.get('https://api.skinport.com/v1/items?app_id=730&currency=USD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (response.data && Array.isArray(response.data)) {
      const allItems = response.data;
      const skins = await Skin.find();

      for (const skin of skins) {
        const itemData = allItems.find(i => i.market_hash_name === skin.name);
        
        if (itemData) {
          const price = Number(itemData.min_price || 0);
          const imageUrl = itemData.image || "";

          // לוגיקת טלגרם: שליחת התראה אם המחיר ירד מתחת ליעד
          if (skin.targetPrice > 0 && price <= skin.targetPrice) {
            try {
              const message = `🎯 Sniper Alert!\nItem: ${skin.name}\nCurrent Price: $${price}\nTarget: $${skin.targetPrice}\nLink: https://skinport.com/item/730/${skin.name.replace(/ /g, '-')}`;
              await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
              console.log(`📱 Telegram Alert sent for ${skin.name}`);
            } catch (teleErr) {
              console.error(`❌ Telegram failed for ${skin.name}:`, teleErr.message);
            }
          }

          // עדכון מסד הנתונים וההיסטוריה לגרף
          await Skin.findByIdAndUpdate(skin._id, {
            $set: { price, image: imageUrl, lastUpdated: Date.now() },
            $push: { priceHistory: { price, date: Date.now() } }
          });
        }
      }
      console.log("🏁 Scan completed successfully.");
    }
  } catch (err) {
    if (err.response?.status === 429) {
      console.error("❌ API Blocked (429). Cooling down...");
    } else {
      console.error("❌ API Error:", err.message);
    }
  } finally {
    isScanning = false;
  }
};

// הרצת סריקה כל 30 דקות למניעת חסימות
setInterval(updatePricesAutomatically, 30 * 60 * 1000);

// נתיבי ה-API
app.get('/api/tracked-skins', async (req, res) => {
  const skins = await Skin.find().sort({ lastUpdated: -1 });
  res.json(skins);
});

app.post('/api/track-skin', async (req, res) => {
  const { name } = req.body;
  await Skin.findOneAndUpdate({ name }, { name }, { upsert: true });
  res.status(201).json({ message: "Added" });
});

app.patch('/api/update-data/:id', async (req, res) => {
  const { targetPrice } = req.body;
  await Skin.findByIdAndUpdate(req.params.id, { targetPrice: Number(targetPrice) });
  res.json({ message: "Target updated" });
});

app.delete('/api/delete-skin/:id', async (req, res) => {
  await Skin.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // המתנה של 5 דקות בעלייה ראשונה למניעת חסימת IP מ-Render
  setTimeout(updatePricesAutomatically, 5 * 60 * 1000);
});