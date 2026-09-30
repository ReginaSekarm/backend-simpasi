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