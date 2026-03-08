import 'dotenv/config';
import express from 'express';
import cors from 'cors'; 
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const app = express();
app.use(cors({
   origin:[ 'https://safespace-health.netlify.app','https://safespace-9q19phv3r-mashebercctechet-3463s-projects.vercel.app','http://localhost:5174','http://localhost:3000','http://localhost:5175',  
     'http://localhost:5173',   
     'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());
app.get("/", (req, res) => {res.send("Mental Health API is running :rocket:");
});
// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server is working on port ${PORT}`));