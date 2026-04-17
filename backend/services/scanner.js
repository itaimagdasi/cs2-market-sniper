import axios from 'axios';
import Skin from '../models/Skin.js';
import { sendTelegramMessage } from './telegram.js';
import { API_URLS, HEADERS } from '../config/constants.js';

let isScanning = false;

export const updatePricesAutomatically = async () => {
  if (isScanning) return;
  isScanning = true;
  console.log("🕒 [Safe-Scan] Checking prices and Telegram alerts...");

  try {
    const response = await axios.get(API_URLS.SKINPORT_ITEMS, { headers: HEADERS });

    if (response.data && Array.isArray(response.data)) {
      const allItems = response.data;
      const skins = await Skin.find();

      for (const skin of skins) {
        const itemData = allItems.find(i => i.market_hash_name === skin.name);

        if (itemData) {
          const price = Number(itemData.min_price || 0);
          const imageUrl = itemData.image || "";

          // Telegram logic: send alert if price dropped below target
          if (skin.targetPrice > 0 && price <= skin.targetPrice) {
            const message = `🎯 Sniper Alert!\nItem: ${skin.name}\nCurrent Price: $${price}\nTarget: $${skin.targetPrice}\nLink: https://skinport.com/item/730/${skin.name.replace(/ /g, '-')}`;
            const sent = await sendTelegramMessage(message);
            if (sent) {
              console.log(`📱 Telegram Alert sent for ${skin.name}`);
            }
          }

          // Update database and history for graph
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