import { Request, Response } from 'express';
import { CheckupModel } from '../models/checkupModel.js';

const VALID_STATUS = ['normal', 'berisiko', 'stunting'];

// Ambil id kader dari hasil middleware auth
const getKaderId = (req: Request, res: Response): number => {
    const fromLocals = res.locals?.userId;
    const fromReq = (req as any).user?.id;
    return Number(fromLocals || fromReq || 1); // fallback 1 hanya untuk testing
};

// Riwayat pemeriksaan untuk satu anak
export const getCheckupsByBaby = async (req: Request, res: Response): Promise<void> => {
    const { babyId } = req.params;
    try {
        const checkups = await CheckupModel.getByBabyId(Number(babyId));
        res.status(200).json({ success: true, data: checkups });
    } catch (error) {
        console.error('Error getCheckupsByBaby:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat pemeriksaan.' });
    }
};

// Kader: tambah pemeriksaan baru
export const createCheckup = async (req: Request, res: Response): Promise<void> => {
    const kaderId = getKaderId(req, res);
    const {
        babyId, babyAgeMonths, checkupDate, weightKg, heightCm,
        headCircumferenceCm, lilaCm, kaderNotes, recommendedFood,
        conditionStatus, followUp, nextCheckupDate
    } = req.body;

    if (!babyId || !checkupDate || !weightKg || !heightCm) {
        res.status(400).json({ success: false, message: 'Data pemeriksaan belum lengkap.' });
        return;
    }

    try {
        const newId = await CheckupModel.create({
            babyId: Number(babyId),
            checkedBy: kaderId,
            babyAgeMonths: babyAgeMonths || 0,
            checkupDate,
            weightKg: Number(weightKg),
            heightCm: Number(heightCm),
            headCircumferenceCm: headCircumferenceCm ?? null,
            lilaCm: lilaCm ?? null,
            kaderNotes: kaderNotes || '',
            recommendedFood: recommendedFood || '',
            conditionStatus: VALID_STATUS.includes(conditionStatus) ? conditionStatus : 'normal',
            followUp: followUp || null,
            nextCheckupDate: nextCheckupDate || null
        });
        res.status(201).json({ success: true, message: 'Pemeriksaan berhasil disimpan!', data: { id: newId } });
    } catch (error) {
        console.error('Error createCheckup:', error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan pemeriksaan ke database.' });
    }
};

// Kader: edit pemeriksaan (maksimal 24 jam setelah dibuat)
export const updateCheckup = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
        babyAgeMonths, checkupDate, weightKg, heightCm,
        headCircumferenceCm, lilaCm, kaderNotes, recommendedFood, conditionStatus
    } = req.body;

    if (!checkupDate || !weightKg || !heightCm) {
        res.status(400).json({ success: false, message: 'Data pemeriksaan belum lengkap.' });
        return;
    }

    try {
        const checkup = await CheckupModel.getById(Number(id));
        if (!checkup) {
            res.status(404).json({ success: false, message: 'Data pemeriksaan tidak ditemukan!' });
            return;
        }
        if (!Number(checkup.can_edit)) {
            res.status(403).json({ success: false, message: 'Pemeriksaan hanya dapat diedit dalam 24 jam setelah disimpan.' });
            return;
        }

        await CheckupModel.update(Number(id), {
            babyAgeMonths: babyAgeMonths || 0,
            checkupDate,
            weightKg: Number(weightKg),
            heightCm: Number(heightCm),
            headCircumferenceCm: headCircumferenceCm ?? null,
            lilaCm: lilaCm ?? null,
            kaderNotes: kaderNotes || '',
            recommendedFood: recommendedFood || '',
            conditionStatus: VALID_STATUS.includes(conditionStatus) ? conditionStatus : 'normal'
        });
        res.status(200).json({ success: true, message: 'Pemeriksaan berhasil diperbarui!' });
    } catch (error) {
        console.error('Error updateCheckup:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui pemeriksaan.' });
    }
};

// Kader: hapus pemeriksaan (maksimal 24 jam setelah dibuat)
export const deleteCheckup = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const checkup = await CheckupModel.getById(Number(id));
        if (!checkup) {
            res.status(404).json({ success: false, message: 'Data pemeriksaan tidak ditemukan!' });
            return;
        }
        if (!Number(checkup.can_edit)) {
            res.status(403).json({ success: false, message: 'Pemeriksaan hanya dapat dihapus dalam 24 jam setelah disimpan.' });
            return;
        }
        await CheckupModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Pemeriksaan berhasil dihapus!' });
    } catch (error) {
        console.error('Error deleteCheckup:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus pemeriksaan.' });
    }
};

// Dashboard kader: ringkasan angka
export const getKaderDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    const kaderId = getKaderId(req, res);
    try {
        const summary = await CheckupModel.getSummaryByKader(kaderId);
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error('Error getKaderDashboardSummary:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan dashboard.' });
    }
};

// Dashboard kader: aktivitas terbaru
export const getKaderRecentActivity = async (req: Request, res: Response): Promise<void> => {
    const kaderId = getKaderId(req, res);
    try {
        const activity = await CheckupModel.getRecentActivity(kaderId);
        res.status(200).json({ success: true, data: activity });
    } catch (error) {
        console.error('Error getKaderRecentActivity:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil aktivitas terbaru.' });
    }
};