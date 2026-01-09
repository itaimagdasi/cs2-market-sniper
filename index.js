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
// מנגנון הגנה מפני כפל סריקות ושגיאות 429
let isScanning = false;

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

// Schema הכולל שדה לתמונה (Image)
const SkinSchema = new mongoose.Schema({
  name: String,
  image: String, 
  price: { type: Number, default: 0 },
  targetPrice: { type: Number, default: 0 },
  priceHistory: [{ price: Number, date: { type: Date, default: Date.now } }],
  lastUpdated: { type: Date, default: Date.now }
});

const Skin = mongoose.model('Skin', SkinSchema);

// פונקציית הסריקה המרכזית עם מנגנון נעילה
const updatePricesAutomatically = async () => {
  if (isScanning) return;
  isScanning = true;
  
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
          const price = itemData.min_price || skin.price;
          // וידוא משיכת התמונה - Skinport לפעמים משתמשים ב-item_page או image
          const imageUrl = itemData.image || itemData.item_page || ""; 

          await Skin.findByIdAndUpdate(skin._id, {
            $set: { 
              price, 
              image: imageUrl, // שמירה מפורשת
              lastUpdated: Date.now() 
            },
            $push: { priceHistory: { price, date: Date.now() } }
          });
          console.log(`✅ Sync OK: ${skin.name} | Image: ${imageUrl ? 'Found' : 'Missing'}`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Scan Error:", err.message);
  } finally {
    isScanning = false;
  }
};

// הגדרת זמני סריקה - מרווח בטוח של 15 דקות למניעת חסימות
setInterval(updatePricesAutomatically, 15 * 60 * 1000);

// API Routes
app.get('/api/tracked-skins', async (req, res) => {
  try {
    const skins = await Skin.find().sort({ lastUpdated: -1 });
    const results = skins.map(s => {
      // חישוב SMA עבור כל נקודה בהיסטוריה
      const historyWithSMA = s.priceHistory.map((point, index) => {
        const window = s.priceHistory.slice(Math.max(0, index - 9), index + 1);
        const avg = window.reduce((acc, curr) => acc + curr.price, 0) / window.length;
        return { price: point.price, date: point.date, sma: parseFloat(avg.toFixed(2)) };
      });
      return { ...s._doc, priceHistory: historyWithSMA };
    });
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/track-skin', async (req, res) => {
  try {
    const { name } = req.body;
    await Skin.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    res.status(201).json({ message: "Added" });
    // הפעלת סריקה מיד עם הוספת סקין (רק אם אין סריקה רצה)
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
  // הפעלה ראשונית לאחר 30 שניות כדי לא להעמיס על ה-API בעליית השרת
  setTimeout(updatePricesAutomatically, 30000); 
});