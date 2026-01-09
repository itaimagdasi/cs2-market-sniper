# CS2 Market Sniper & Analyzer 🎯

A professional Fullstack MERN application for tracking Counter-Strike 2 skin prices, analyzing market trends, and delivering real-time alerts via Telegram.

## 🚀 Overview
This project was developed to solve the challenge of monitoring volatile virtual asset prices. It implements a robust backend scanner that overcomes public API rate-limiting and provides statistical insights for traders.

## 🛠️ Tech Stack
* **Frontend:** React.js (Vite), Recharts for data visualization.
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB Atlas (NoSQL) for persistent data storage.
* **Cloud Hosting:** Render (Automated CI/CD from GitHub).
* **Integrations:** Telegram Bot API for push notifications.

## ✨ Key Features & Technical Challenges
* **Advanced API Integration:** Successfully implemented a workaround for Steam's Rate-Limiting (429/403 errors) by transitioning to an Aggregator API (CSGOBackpack) and using custom User-Agent headers.
* **Statistical Analysis:** Built-in calculation of the Simple Moving Average (SMA) to identify market entry points.
* **Real-time Sniper:** Automated background worker that triggers Telegram alerts the moment a skin hits its target price.
* **Data Consistency:** Full CRUD operations with Mongoose, ensuring data integrity across market updates.

## 📊 Mathematical Logic
The analyzer utilizes a Simple Moving Average (SMA) over a window of the last 10 data points to smooth out price volatility:
SMA = (Sum of prices) / (Number of periods)

## 🏗️ Architecture
1. **The Scanner:** A Node.js background loop that fetches global prices every 10 minutes.
2. **The API:** RESTful endpoints for managing the tracking list and historical data.
3. **The Dashboard:** A responsive React interface for real-time visualization.

## ⚙️ Setup & Deployment
1. Clone the repository.
2. Configure Environment Variables: `MONGO_URI`, `TELEGRAM_TOKEN`, `CHAT_ID`.
3. Install dependencies: `npm install`.
4. Run locally or deploy to Render/Vercel.
