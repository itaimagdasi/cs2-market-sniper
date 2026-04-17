import express from 'express';
import {
  getTrackedSkins,
  addSkin,
  updateTarget,
  deleteSkin
} from '../controllers/skinController.js';

const router = express.Router();

router.get('/tracked-skins', getTrackedSkins);
router.post('/track-skin', addSkin);
router.patch('/update-data/:id', updateTarget);
router.delete('/delete-skin/:id', deleteSkin);

export default router;