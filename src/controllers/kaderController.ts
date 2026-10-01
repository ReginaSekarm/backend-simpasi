import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { KaderModel } from '../models/kaderModel.js';
import { UserModel } from '../models/userModel.js';

// Lihat profil kader
export const getKaderProfile = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    try {
        const profile = await KaderModel.getProfile(userId);
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil profil.' });
    }
};

// Lengkapi / update profil kader (gabungan data users + kader_profiles)
export const updateKaderProfile = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { fullName, email, nik, gender, birthDate, phone, posyanduName, position, region } = req.body;

    try {
        await KaderModel.updateUserInfo(userId, { fullName, email, nik, gender, birthDate, phone });

        const alreadyHasProfile = await KaderModel.hasProfile(userId);
        if (alreadyHasProfile) {
            await KaderModel.updatePosyanduInfo(userId, { posyanduName, position, region });
        } else {
            await KaderModel.createProfile(userId, { posyanduName, position, region });
        }

        res.status(200).json({ success: true, message: 'Profil berhasil diperbarui!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
    }
};

// Ganti kata sandi
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { oldPassword, newPassword } = req.body;

    try {
        const user = await UserModel.findById(userId);
        if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
            res.status(401).json({ success: false, message: 'Kata sandi lama salah!' });
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