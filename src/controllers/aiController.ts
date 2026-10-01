import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { BabyModel } from '../models/babyModel.js';
import { AiModel } from '../models/aiModel.js';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

const calculateAgeInMonths = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12;
    months += now.getMonth() - birth.getMonth();
    return months;
};

export const recommendMenu = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { babyId, allergies, availableIngredients } = req.body;

    try {
        const baby = await BabyModel.getById(Number(babyId));
        if (!baby) {
            res.status(404).json({ success: false, message: 'Data anak tidak ditemukan!' });
            return;
        }

        // update alergi ke data anak, supaya tersimpan untuk pemakaian berikutnya
        if (allergies) {
            await BabyModel.updateAllergies(baby.id, allergies);
        }

        const ageMonths = calculateAgeInMonths(baby.birth_date);
        const conditionStatus = await AiModel.getLatestConditionByBaby(baby.id);

        const prompt = `Kamu adalah asisten gizi anak untuk aplikasi pencegahan stunting bernama SiMPASI.

Buatkan SATU rekomendasi menu MPASI/makanan untuk balita dengan data berikut:
- Nama: ${baby.full_name}
- Usia: ${ageMonths} bulan
- Kondisi gizi saat ini: ${conditionStatus || 'belum ada data pemeriksaan'}
- Alergi: ${allergies || 'tidak ada'}
- Bahan makanan yang tersedia di rumah: ${availableIngredients}

Ketentuan:
- Resep harus aman dari bahan yang menyebabkan alergi di atas.
- Prioritaskan bahan yang disebutkan tersedia di rumah.
- Kalau kondisi gizi "stunting" atau "berisiko", prioritaskan menu tinggi protein hewani dan kalori padat gizi.
- Jawab HANYA dalam format berikut, tanpa basa-basi tambahan:

Nama Menu: [nama menu]
Bahan-bahan:
- [bahan 1]
- [bahan 2]
Cara Membuat:
1. [langkah 1]
2. [langkah 2]
Tips Penting: [tips singkat]`;

                const callGeminiWithRetry = async (maxRetries = 3): Promise<string> => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const result = await ai.models.generateContent({
                        model: 'gemini-flash-latest',
                        contents: prompt
                    });
                    return result.text || 'Maaf, tidak ada respons dari AI.';
                } catch (err: any) {
                    const isOverloaded = err?.status === 503 || err?.message?.includes('UNAVAILABLE');
                    if (isOverloaded && attempt < maxRetries) {
                        console.log(`Gemini sedang sibuk, coba lagi (percobaan ${attempt}/${maxRetries})...`);
                        await new Promise((resolve) => setTimeout(resolve, attempt * 2000)); // tunggu 2s, 4s, 6s
                        continue;
                    }
                    throw err;
                }
            }
            throw new Error('Gagal setelah beberapa percobaan.');
        };

        const aiResponse = await callGeminiWithRetry();

        await AiModel.saveHistory(userId, prompt, aiResponse);

        res.status(200).json({
            success: true,
            data: {
                babyName: baby.full_name,
                ageMonths,
                conditionStatus,
                recommendation: aiResponse
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mendapatkan rekomendasi dari AI.' });
    }
};

export const getAiHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    try {
        const history = await AiModel.getHistoryByUser(userId);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat AI.' });
    }
};

export const getAiHistoryDetail = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const detail = await AiModel.getHistoryById(Number(id));
        if (!detail) {
            res.status(404).json({ success: false, message: 'Riwayat tidak ditemukan!' });
            return;
        }
        res.status(200).json({ success: true, data: detail });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail riwayat.' });
    }
};