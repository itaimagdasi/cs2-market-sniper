# CS2 Market Sniper 🎯

A professional Full-Stack automated tool designed for CS2 traders to track skin prices in real-time and receive instant notifications when items hit a specific target price.

## 🚀 Features
* **Real-Time Price Tracking**: Automatically fetches the lowest market prices from the Skinport API every 30 minutes.
* **Interactive Dashboard**: Built with React, featuring a dynamic table to manage tracked skins and target prices.
* **Price Analytics**: Visualizes price fluctuations using Recharts, including a **Simple Moving Average (SMA)** trend line calculated on the client side.
* **Telegram Alerts**: Integrated Telegram Bot that sends instant notifications when a "deal" is found (Market Price ≤ Target Price).

## 🛠 Tech Stack
* **Frontend**: React.js, Recharts, Axios.
* **Backend**: Node.js (ES Modules), Express.js.
* **Database**: MongoDB (Atlas) for persistent storage of price history and user settings.
* **Communication**: Telegram Bot API for real-time alerts.

## 🧠 Technical Challenges & Solutions

### 1. API Rate Limiting (Error 429)
**Challenge**: Frequent requests from the server's IP (Render) led to temporary blocks from the Skinport API.
**Solution**: Implemented a **"Safe-Scan Mode"**. This includes a 5-minute cooldown upon server startup and a 30-minute interval between scans to maintain a low profile and ensure stability.

### 2. Handling External Assets (CORS/Images)
**Challenge**: Steam's image servers prevent direct hotlinking from external domains, causing broken icons.
**Solution**: Configured the frontend image components with `referrerPolicy="no-referrer"` and `crossOrigin="anonymous"` to bypass security restrictions.

### 3. State Management & Real-Time Updates
**Challenge**: Ensuring the dashboard and graphs reflect the latest database state without full page reloads.
**Solution**: Developed a polling mechanism using React's `useCallback` and `useEffect` hooks, refreshing data every 30 seconds for a seamless user experience.

## 📦 Setup & Deployment
1. **Prerequisites**: Node.js v22+, MongoDB Atlas Account.
2. **Environment Variables**:
   - `MONGO_URI`: Your MongoDB connection string.
   - `TELEGRAM_TOKEN`: Your bot token from BotFather.
   - `TELEGRAM_CHAT_ID`: Your unique Telegram ID.
3. **Execution**:
   ```bash
   npm install
   node index.js
