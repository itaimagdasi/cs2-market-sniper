import Skin from '../models/Skin.js';

export const getTrackedSkins = async (req, res) => {
  try {
    const skins = await Skin.find().sort({ lastUpdated: -1 });
    res.json(skins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch skins' });
  }
};

export const addSkin = async (req, res) => {
  try {
    const { name } = req.body;
    await Skin.findOneAndUpdate({ name }, { name }, { upsert: true });
    res.status(201).json({ message: "Added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add skin' });
  }
};

export const updateTarget = async (req, res) => {
  try {
    const { targetPrice } = req.body;
    await Skin.findByIdAndUpdate(req.params.id, { targetPrice: Number(targetPrice) });
    res.json({ message: "Target updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update target' });
  }
};

export const deleteSkin = async (req, res) => {
  try {
    await Skin.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete skin' });
  }
};