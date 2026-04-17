import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../constants/api.js';
import { addSMAData } from '../utils/chartUtils.js';

export const useSkins = () => {
  const [skins, setSkins] = useState([]);
  const [selectedSkin, setSelectedSkin] = useState(null);

  const fetchSkins = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/tracked-skins`);
      const data = res.data;
      setSkins(data);

      setSelectedSkin(prev => {
        const current = prev ? data.find(s => s._id === prev._id) : data[0];
        if (current) {
          return { ...current, priceHistory: addSMAData(current.priceHistory) };
        }
        return null;
      });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchSkins();
    const interval = setInterval(fetchSkins, 30000);
    return () => clearInterval(interval);
  }, [fetchSkins]);

  const addSkin = async (name) => {
    try {
      await axios.post(`${API_URL}/track-skin`, { name });
      setTimeout(fetchSkins, 3000);
    } catch (err) { alert("Check name"); }
  };

  const updateTarget = async (id, targetPrice) => {
    try {
      await axios.patch(`${API_URL}/update-data/${id}`, { targetPrice });
      fetchSkins();
    } catch (err) { console.error(err); }
  };

  const deleteSkin = async (id) => {
    if (!window.confirm("Delete?")) return;
    try {
      await axios.delete(`${API_URL}/delete-skin/${id}`);
      setSkins(prev => prev.filter(s => s._id !== id));
      if (selectedSkin?._id === id) setSelectedSkin(null);
    } catch (err) { console.error(err); }
  };

  const selectSkin = (skin) => {
    setSelectedSkin({ ...skin, priceHistory: addSMAData(skin.priceHistory) });
  };

  return {
    skins,
    selectedSkin,
    addSkin,
    updateTarget,
    deleteSkin,
    selectSkin,
    fetchSkins
  };
};