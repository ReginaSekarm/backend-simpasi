import { Request, Response } from 'express';
import { BabyModel } from '../models/babyModel.js';

// User: lihat semua anak miliknya
export const getMyBabies = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    try {
        const babies = await BabyModel.getAllByUser(userId);
        res.status(200).json({ success: true, data: babies });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data anak.' });
    }
};

// User/Kader: tambah data anak
export const createBaby = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const role = res.locals.role;
    const {
        fullName, gender, birthDate, parentName, parentEmail,
        weightKg, heightCm, headCircumferenceCm, lilaCm, conditionNote
    } = req.body;

    try {
        const newId = await BabyModel.create({
            userId: role === 'user' ? userId : null,   // kalau kader yang input, user_id null
            addedBy: userId,
            fullName, gender, birthDate, parentName, parentEmail,
            weightKg, heightCm, headCircumferenceCm, lilaCm, conditionNote
        });
        res.status(201).json({ success: true, message: 'Data anak berhasil ditambahkan!', data: { id: newId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menambahkan data anak.' });
    }
};

// Edit data anak
export const updateBaby = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
        fullName, gender, birthDate,
        weightKg, heightCm, headCircumferenceCm, lilaCm, conditionNote
    } = req.body;

    try {
        const baby = await BabyModel.getById(Number(id));
        if (!baby) {
            res.status(404).json({ success: false, message: 'Data anak tidak ditemukan!' });
            return;
        }

        await BabyModel.update(Number(id), {
            fullName, gender, birthDate, weightKg, heightCm, headCircumferenceCm, lilaCm, conditionNote
        });
        res.status(200).json({ success: true, message: 'Data anak berhasil diperbarui!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui data anak.' });
    }
};

// Hapus data anak
export const deleteBaby = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const baby = await BabyModel.getById(Number(id));
        if (!baby) {
            res.status(404).json({ success: false, message: 'Data anak tidak ditemukan!' });
            return;
        }

        await BabyModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Data anak berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus data anak.' });
    }
};

// Kader: lihat semua balita (dengan filter/pencarian nama)
export const getAllBabiesForKader = async (req: Request, res: Response): Promise<void> => {
    const search = req.query.search as string | undefined;
    try {
        const babies = await BabyModel.getAllForKader(search);
        res.status(200).json({ success: true, data: babies });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil data balita.' });
    }
};