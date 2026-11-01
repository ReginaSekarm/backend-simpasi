import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { KaderModel } from '../models/kaderModel.js';
import { UserModel } from '../models/userModel.js';
import { getBlobPhotoError, deleteBlobSafely } from '../services/blobService.js';

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

// Update profil kader.
// Yang boleh diubah: nama, email, NIK, jenis kelamin, tanggal lahir, no WA, foto profil.
// Nama Posyandu, jabatan, wilayah, dan tanggal bergabung dikunci (diisi saat akun dibuat).
// photoUrl: URL hasil POST /api/uploads/profile-photo. Kirim null atau "" untuk menghapus foto.
export const updateKaderProfile = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { fullName, email, nik, gender, birthDate, phone, photoUrl } = req.body;

    // foto profil: undefined = tidak diubah, null atau "" = hapus, selain itu = foto baru
    const photoProvided = photoUrl !== undefined;
    const newPhotoUrl: string | null = photoProvided && photoUrl ? String(photoUrl).trim() : null;

    if (newPhotoUrl !== null) {
        const photoError = getBlobPhotoError(newPhotoUrl, 'profiles');
        if (photoError) {
            res.status(400).json({ success: false, message: photoError });
            return;
        }
    }

    try {
        const current = await UserModel.findById(userId);
        if (!current) {
            res.status(404).json({ success: false, message: 'Akun tidak ditemukan!' });
            return;
        }

        if (photoProvided && !(await KaderModel.hasProfile(userId))) {
            res.status(404).json({
                success: false,
                message: 'Data profil kader (posyandu, jabatan, wilayah) belum ada, sehingga foto belum bisa disimpan!'
            });
            return;
        }

        // field yang tidak dikirim tetap memakai nilai lama
        await KaderModel.updateUserInfo(userId, {
            fullName: fullName ?? current.full_name,
            email: email ?? current.email,
            nik: nik ?? current.nik,
            gender: gender ?? current.gender,
            birthDate: birthDate ?? current.birth_date,
            phone: phone ?? current.phone
        });

        if (photoProvided) {
            const oldPhotoUrl = await KaderModel.getPhotoUrl(userId);
            await KaderModel.updatePhotoUrl(userId, newPhotoUrl);

            // foto lama dihapus dari Vercel Blob supaya storage tidak menumpuk
            if (oldPhotoUrl && oldPhotoUrl !== newPhotoUrl) {
                await deleteBlobSafely(oldPhotoUrl);
            }
        }

        res.status(200).json({ success: true, message: 'Profil berhasil diperbarui!' });
    } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ success: false, message: 'Email atau NIK sudah digunakan akun lain!' });
            return;
        }
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