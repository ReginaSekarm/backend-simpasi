import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();

// Daftar origin yang diizinkan: Next.js (3000), Vite (5173), dan FRONTEND_URL dari .env
// FRONTEND_URL boleh lebih dari satu, pisahkan dengan koma
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    ...(process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
        : []),
];

app.use(cors({
    origin: (origin, callback) => {
        // origin kosong = Flutter/mobile atau Postman, tetap diizinkan
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        // Izinkan origin localhost / 127.0.0.1 dengan port berapa pun saat development
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
            return callback(null, true);
        }
        callback(new Error('Origin tidak diizinkan oleh CORS'));
    },
    credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: 'SiMPASI Backend Berjalan!' });
});

app.use('/api', apiRoutes);

export default app;