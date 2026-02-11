import express from 'express';
import { handleChat, getChatHistory } from '../controllers/chatController.js';
import { getAllDoctors, assignDoctor, getHighRiskPatients, doctorReply } from '../controllers/doctorController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
//patient routs
router.get('/doctors', verifyToken, getAllDoctors);
router.post('/assign', verifyToken, assignDoctor);
router.post('/send', verifyToken, handleChat);
//doctor routs
router.get('/alerts', verifyToken, getHighRiskPatients);
router.post('/reply', verifyToken, doctorReply); // New endpoint for doctor to reply
router.get('/history/:patientId?', verifyToken, getChatHistory);
export default router;