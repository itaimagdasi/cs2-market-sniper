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
let isScanning = false;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Error: ' + err));

const SkinSchema = new mongoose.Schema({
  name: String,
  image: String, 
  price: { type: Number, default: 0 },
  targetPrice: { type: Number, default: 0 },
  priceHistory: [{ price: Number, date: { type: Date, default: Date.now } }],
  lastUpdated: { type: Date, default: Date.now }
});

const Skin = mongoose.model('Skin', SkinSchema);

// פונקציית סריקה זהירה מאוד
const updatePricesAutomatically = async () => {
  if (isScanning) return;
  isScanning = true;
  console.log("🕒 [Safe-Scan] Attempting to fetch data...");

  try {
    const response = await axios.get('https://api.skinport.com/v1/items?app_id=730&currency=USD', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
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

          await Skin.findByIdAndUpdate(skin._id, {
            $set: { price, image: imageUrl, lastUpdated: Date.now() },
            $push: { priceHistory: { price, date: Date.now() } }
          });
          console.log(`✅ Updated: ${skin.name} ($${price})`);
        }
      }
      console.log("🏁 Scan completed successfully.");
    }
  } catch (err) {
    if (err.response?.status === 429) {
      console.error("❌ API Blocked (429). We must wait 30+ minutes.");
    } else {
      console.error("❌ API Error:", err.message);
    }
  } finally {
    isScanning = false;
  }
};

// סריקה רק פעם ב-30 דקות כדי לא להיחסם לעולם
setInterval(updatePricesAutomatically, 30 * 60 * 1000);

// API Routes
app.get('/api/tracked-skins', async (req, res) => {
  const skins = await Skin.find().sort({ lastUpdated: -1 });
  res.json(skins);
});

app.post('/api/track-skin', async (req, res) => {
  const { name } = req.body;
  await Skin.findOneAndUpdate({ name }, { name }, { upsert: true });
  res.status(201).json({ message: "Added" });
});

app.delete('/api/delete-skin/:id', async (req, res) => {
  await Skin.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Safe Server running on port ${PORT}`);
  // לא מפעילים סריקה מיד! נחכה 5 דקות מהעלייה הראשונה
  setTimeout(updatePricesAutomatically, 5 * 60 * 1000);
});