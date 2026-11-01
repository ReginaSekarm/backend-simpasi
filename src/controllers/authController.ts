import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';
import { OtpModel } from '../models/otpModel.js';
import dotenv from 'dotenv';

dotenv.config();

type OtpPurpose = 'register' | 'reset_password';

const OTP_EXPIRE_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;

const generateOtp = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Matikan kode lama, buat kode baru, lalu "kirim"
const issueOtp = async (userId: number, email: string, purpose: OtpPurpose, tag: string): Promise<void> => {
    await OtpModel.invalidateUnused(userId, purpose);
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000);
    await OtpModel.create(userId, otpCode, purpose, expiresAt);

    // TODO: kirim otpCode ke email pakai nodemailer.
    // Untuk sekarang, ditampilkan di console supaya bisa dites tanpa setup email dulu.
    console.log(`[${tag}] Email: ${email} | Kode: ${otpCode}`);
};

// Sisa detik yang harus ditunggu sebelum boleh minta kode baru (0 = boleh)
const getRemainingCooldown = async (userId: number, purpose: OtpPurpose): Promise<number> => {
    const secondsAgo = await OtpModel.getSecondsSinceLatest(userId, purpose);
    if (secondsAgo === null) return 0;
    return Math.max(0, RESEND_COOLDOWN_SECONDS - secondsAgo);
};

// REGISTER
export const register = async (req: Request, res: Response): Promise<void> => {
    const { fullName, email, phone, password } = req.body;
    try {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            // akun sudah dibuat tapi belum verifikasi OTP -> arahkan ke kirim ulang OTP
            if (!existingUser.is_verified) {
                res.status(409).json({
                    success: false,
                    message: 'Email sudah terdaftar tetapi belum diverifikasi. Silakan kirim ulang kode OTP.',
                    needsVerification: true
                });
                return;
            }
            res.status(409).json({ success: false, message: 'Email sudah terdaftar!' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await UserModel.create(fullName, email, phone, hashedPassword, 'user');

        await issueOtp(userId, email, 'register', 'OTP REGISTER');

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
    const email = String(req.body.email ?? '').trim();
    const { otpCode } = req.body;
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

// KIRIM ULANG OTP (registrasi atau lupa kata sandi)
export const resendOtp = async (req: Request, res: Response): Promise<void> => {
    const email = String(req.body.email ?? '').trim();
    const purpose: OtpPurpose = req.body.purpose === 'reset_password' ? 'reset_password' : 'register';

    try {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ success: false, message: 'Email tidak terdaftar!' });
            return;
        }

        if (purpose === 'register' && user.is_verified) {
            res.status(400).json({ success: false, message: 'Akun sudah diverifikasi. Silakan login.' });
            return;
        }

        const remaining = await getRemainingCooldown(user.id, purpose);
        if (remaining > 0) {
            res.status(429).json({
                success: false,
                message: `Tunggu ${remaining} detik sebelum meminta kode baru.`,
                retryAfterSeconds: remaining
            });
            return;
        }

        await issueOtp(user.id, email, purpose, `OTP RESEND - ${purpose}`);

        res.status(200).json({
            success: true,
            message: 'Kode OTP baru telah dikirim ke email Anda.',
            retryAfterSeconds: RESEND_COOLDOWN_SECONDS
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};

// LOGIN
export const login = async (req: Request, res: Response): Promise<void> => {
    const email = String(req.body.email ?? '').trim();
    const { password } = req.body;
    try {
        const user = await UserModel.findByEmail(email);

        // email tidak ditemukan ATAU kata sandi salah -> pesan sengaja dibuat sama
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ success: false, message: 'Email atau Kata Sandi tidak cocok' });
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
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};

// FORGOT PASSWORD - kirim OTP
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const email = String(req.body.email ?? '').trim();
    try {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            res.status(404).json({ success: false, message: 'Email tidak terdaftar!' });
            return;
        }

        const remaining = await getRemainingCooldown(user.id, 'reset_password');
        if (remaining > 0) {
            res.status(429).json({
                success: false,
                message: `Tunggu ${remaining} detik sebelum meminta kode baru.`,
                retryAfterSeconds: remaining
            });
            return;
        }

        await issueOtp(user.id, email, 'reset_password', 'OTP RESET PASSWORD');

        res.status(200).json({
            success: true,
            message: 'Kode OTP telah dikirim ke email Anda.',
            retryAfterSeconds: RESEND_COOLDOWN_SECONDS
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};

// RESET PASSWORD
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const email = String(req.body.email ?? '').trim();
    const { otpCode, newPassword } = req.body;
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