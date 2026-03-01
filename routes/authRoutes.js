import express from 'express';
import { signupPatient, signupDoctor, login ,logout} from '../controllers/authController.js';
const router = express.Router();

router.post('/signup', signupPatient);

router.post('/signup-doctor', signupDoctor);
router.post('/login', login);
router.post('/logout', logout);
export default router;