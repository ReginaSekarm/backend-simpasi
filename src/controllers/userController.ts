import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/userModel.js';

// Lihat profil user (orang tua)
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'Akun tidak ditemukan!' });
            return;
        }

        // kata sandi tidak pernah dikirim ke client
        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                created_at: user.created_at ?? null
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil profil.' });
    }
};

// Update profil user: nama lengkap, email, dan no HP.
// Field yang tidak dikirim tetap memakai nilai lama (validasi ada di validateUserProfile).
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { fullName, email, phone } = req.body;

    try {
        const current = await UserModel.findById(userId);
        if (!current) {
            res.status(404).json({ success: false, message: 'Akun tidak ditemukan!' });
            return;
        }

        await UserModel.updateProfile(userId, {
            fullName: fullName ?? current.full_name,
            email: email ?? current.email,
            phone: phone ?? current.phone
        });

        res.status(200).json({ success: true, message: 'Profil berhasil diperbarui!' });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, message: 'Email atau nomor HP sudah digunakan akun lain!' });
            return;
        }
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
    }
};

// Ganti kata sandi user (kata sandi lama, baru, konfirmasi)
// Format kata sandi baru dan konfirmasi sudah dicek di validateChangePassword.
export const changeUserPassword = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { oldPassword, newPassword } = req.body;

    try {
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'Akun tidak ditemukan!' });
            return;
        }

        // 400 (bukan 401) supaya aplikasi tidak mengira sesi login sudah habis
        if (!(await bcrypt.compare(oldPassword, user.password))) {
            res.status(400).json({ success: false, message: 'Kata sandi lama salah!' });
            return;
        }

        if (await bcrypt.compare(newPassword, user.password)) {
            res.status(400).json({ success: false, message: 'Kata sandi baru tidak boleh sama dengan kata sandi lama!' });
            return;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await UserModel.updatePassword(userId, hashedPassword);

        res.status(200).json({ success: true, message: 'Kata sandi berhasil diubah!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengubah kata sandi.' });
    }
};