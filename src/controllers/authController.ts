import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';
import { OtpModel } from '../models/otpModel.js';
import dotenv from 'dotenv';

dotenv.config();

const generateOtp = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// REGISTER
export const register = async (req: Request, res: Response): Promise<void> => {
    const { fullName, email, phone, password } = req.body;
    try {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            res.status(409).json({ success: false, message: 'Email sudah terdaftar!' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await UserModel.create(fullName, email, phone, hashedPassword, 'user');

        const otpCode = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // berlaku 5 menit
        await OtpModel.create(userId, otpCode, 'register', expiresAt);

        // TODO: kirim otpCode ke email pakai nodemailer.
        // Untuk sekarang, ditampilkan di console supaya bisa dites tanpa setup email dulu.
        console.log(`[OTP REGISTER] Email: ${email} | Kode: ${otpCode}`);

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil! Kode OTP telah dikirim ke email Anda.',
            userId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};

// VERIFY OTP (registrasi)
export const verifyRegisterOtp = async (req: Request, res: Response): Promise<void> => {
    const { email, otpCode } = req.body;
    try {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ success: false, message: 'User tidak ditemukan!' });
            return;
        }

        const validOtp = await OtpModel.findValidOtp(user.id, otpCode, 'register');
        if (!validOtp) {
            res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa!' });
            return;
        }

        await OtpModel.markAsUsed(validOtp.id);
        await UserModel.verifyUser(user.id);

        res.status(200).json({ success: true, message: 'Verifikasi berhasil! Akun Anda sudah aktif.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};

// LOGIN
export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findByEmail(email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ success: false, message: 'Email atau kata sandi salah!' });
            return;
        }

        if (!user.is_verified) {
            res.status(403).json({ success: false, message: 'Akun belum diverifikasi. Silakan cek email Anda.' });
            return;
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '2h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login berhasil!',
            token,
            user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};

// FORGOT PASSWORD - kirim OTP
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    try {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ success: false, message: 'Email tidak terdaftar!' });
            return;
        }

        const otpCode = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await OtpModel.create(user.id, otpCode, 'reset_password', expiresAt);

        console.log(`[OTP RESET PASSWORD] Email: ${email} | Kode: ${otpCode}`);

        res.status(200).json({ success: true, message: 'Kode OTP telah dikirim ke email Anda.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};

// RESET PASSWORD
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { email, otpCode, newPassword } = req.body;
    try {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ success: false, message: 'User tidak ditemukan!' });
            return;
        }

        const validOtp = await OtpModel.findValidOtp(user.id, otpCode, 'reset_password');
        if (!validOtp) {
            res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa!' });
            return;
        }

        await OtpModel.markAsUsed(validOtp.id);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePassword(user.id, hashedPassword);

        res.status(200).json({ success: true, message: 'Kata sandi berhasil diubah! Silakan login kembali.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};