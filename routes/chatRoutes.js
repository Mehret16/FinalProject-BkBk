import express from 'express';
import { 
    handleChat, 
    getChatHistory, 
    notifySelectedDoctor 
} from '../controllers/chatController.js';
import { 
    getAllDoctors, 
    assignDoctor, 
    getHighRiskPatients, 
    doctorReply 
} from '../controllers/doctorController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = express.Router();
router.get('/doctors', verifyToken, getAllDoctors);
router.post('/assign', verifyToken, assignDoctor);
router.post('/send', verifyToken, handleChat);
router.post('/notify-doctor', verifyToken, notifySelectedDoctor);
router.get('/alerts', verifyToken, getHighRiskPatients);
router.post('/reply', verifyToken, doctorReply); 
router.get('/history/:patientId?', verifyToken, getChatHistory);
export default router;