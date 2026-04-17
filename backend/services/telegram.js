import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });

export const sendTelegramMessage = async (text) => {
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, text);
    return true;
  } catch (error) {
    console.error('❌ Telegram send failed:', error.message);
    return false;
  }
};

export default bot;