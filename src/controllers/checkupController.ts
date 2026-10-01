import { Request, Response } from 'express';
import { CheckupModel } from '../models/checkupModel.js';

// Riwayat pemeriksaan untuk satu anak (dipakai user & kader)
export const getCheckupsByBaby = async (req: Request, res: Response): Promise<void> => {
    const { babyId } = req.params;
    try {
        const checkups = await CheckupModel.getByBabyId(Number(babyId));
        res.status(200).json({ success: true, data: checkups });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat pemeriksaan.' });
    }
};

// Kader: tambah pemeriksaan baru
export const createCheckup = async (req: Request, res: Response): Promise<void> => {
    const kaderId = res.locals.userId;
    const {
        babyId, babyAgeMonths, checkupDate, weightKg, heightCm,
        headCircumferenceCm, lilaCm, kaderNotes, recommendedFood,
        conditionStatus, followUp, nextCheckupDate
    } = req.body;

    try {
        const newId = await CheckupModel.create({
            babyId, checkedBy: kaderId, babyAgeMonths, checkupDate, weightKg, heightCm,
            headCircumferenceCm, lilaCm, kaderNotes, recommendedFood,
            conditionStatus, followUp, nextCheckupDate
        });
        res.status(201).json({ success: true, message: 'Pemeriksaan berhasil disimpan!', data: { id: newId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan pemeriksaan.' });
    }
};

// Kader: hapus pemeriksaan
export const deleteCheckup = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const checkup = await CheckupModel.getById(Number(id));
        if (!checkup) {
            res.status(404).json({ success: false, message: 'Data pemeriksaan tidak ditemukan!' });
            return;
        }
        await CheckupModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Pemeriksaan berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus pemeriksaan.' });
    }
};

// Dashboard kader: ringkasan angka
export const getKaderDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    const kaderId = res.locals.userId;
    try {
        const summary = await CheckupModel.getSummaryByKader(kaderId);
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan dashboard.' });
    }
};

// Dashboard kader: aktivitas terbaru
export const getKaderRecentActivity = async (req: Request, res: Response): Promise<void> => {
    const kaderId = res.locals.userId;
    try {
        const activity = await CheckupModel.getRecentActivity(kaderId);
        res.status(200).json({ success: true, data: activity });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil aktivitas terbaru.' });
    }
};