import { Request, Response, NextFunction } from 'express';

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
    const { fullName, email, phone, password, agreeToTerms } = req.body;
    if (!fullName || !email || !phone || !password) {
        res.status(400).json({ success: false, message: 'Nama lengkap, email, no HP, dan kata sandi wajib diisi!' });
        return;
    }
    if (!email.includes('@')) {
        res.status(400).json({ success: false, message: 'Format email tidak valid!' });
        return;
    }
    if (!agreeToTerms) {
        res.status(400).json({ success: false, message: 'Anda harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi!' });
        return;
    }
    next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email dan kata sandi wajib diisi!' });
        return;
    }
    next();
};

export const validateOtp = (req: Request, res: Response, next: NextFunction): void => {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
        res.status(400).json({ success: false, message: 'Email dan kode OTP wajib diisi!' });
        return;
    }
    next();
};

export const validateResetPassword = (req: Request, res: Response, next: NextFunction): void => {
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
        res.status(400).json({ success: false, message: 'Email, kode OTP, dan kata sandi baru wajib diisi!' });
        return;
    }
    next();
};

export const validateBaby = (req: Request, res: Response, next: NextFunction): void => {
    const { fullName, gender, birthDate, weightKg, heightCm, headCircumferenceCm, lilaCm } = req.body;
    if (!fullName || !gender || !birthDate || !weightKg || !heightCm || !headCircumferenceCm || !lilaCm) {
        res.status(400).json({ success: false, message: 'Nama, jenis kelamin, TTL, BB, TB, lingkar kepala, dan LiLA wajib diisi!' });
        return;
    }
    if (gender !== 'L' && gender !== 'P') {
        res.status(400).json({ success: false, message: 'Jenis kelamin harus L atau P!' });
        return;
    }
    next();
};

export const validateCheckup = (req: Request, res: Response, next: NextFunction): void => {
    const { babyId, babyAgeMonths, checkupDate, weightKg, heightCm, conditionStatus } = req.body;
    if (!babyId || !babyAgeMonths || !checkupDate || !weightKg || !heightCm || !conditionStatus) {
        res.status(400).json({ success: false, message: 'Data balita, usia, tanggal, BB, TB, dan kondisi wajib diisi!' });
        return;
    }
    if (!['normal', 'berisiko', 'stunting'].includes(conditionStatus)) {
        res.status(400).json({ success: false, message: 'Kondisi harus normal, berisiko, atau stunting!' });
        return;
    }
    next();
};

export const validateChangePassword = (req: Request, res: Response, next: NextFunction): void => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Kata sandi lama dan baru wajib diisi!' });
        return;
    }
    next();
};

export const validateRecipe = (req: Request, res: Response, next: NextFunction): void => {
    const { title, ingredients, steps, status } = req.body;
    if (!title || !ingredients || !steps || !status) {
        res.status(400).json({ success: false, message: 'Nama resep, bahan, langkah, dan status wajib diisi!' });
        return;
    }
    if (!['draft', 'terpublikasi'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status harus draft atau terpublikasi!' });
        return;
    }
    next();
};

export const validateComment = (req: Request, res: Response, next: NextFunction): void => {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
        res.status(400).json({ success: false, message: 'Komentar wajib diisi!' });
        return;
    }
    next();
};

export const validateAiRequest = (req: Request, res: Response, next: NextFunction): void => {
    const { babyId, availableIngredients } = req.body;
    if (!babyId || !availableIngredients) {
        res.status(400).json({ success: false, message: 'Data anak dan bahan di rumah wajib diisi!' });
        return;
    }
    next();
};