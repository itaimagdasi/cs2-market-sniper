import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import skinRoutes from './routes/skins.js';
import { updatePricesAutomatically } from './services/scanner.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', skinRoutes);

// Connect to database
await connectDB();

// Run scan every 30 minutes to prevent blocks
setInterval(updatePricesAutomatically, 30 * 60 * 1000);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Safe Server (ESM) running on port ${PORT}`);
  // Wait 5 minutes on first startup
  setTimeout(updatePricesAutomatically, 5 * 60 * 1000);
});