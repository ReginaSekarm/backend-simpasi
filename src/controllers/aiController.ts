import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { BabyModel } from '../models/babyModel.js';
import { AiModel } from '../models/aiModel.js';

dotenv.config({ override: true });

const calculateAgeInMonths = (birthDate: any, fallbackAgeMonths?: any): number => {
    if (typeof fallbackAgeMonths === 'number' && !Number.isNaN(fallbackAgeMonths)) {
        return Math.max(0, fallbackAgeMonths);
    }
    if (fallbackAgeMonths !== undefined && fallbackAgeMonths !== null && String(fallbackAgeMonths).trim() !== '') {
        const parsed = Number(fallbackAgeMonths);
        if (!Number.isNaN(parsed)) return Math.max(0, parsed);
    }

    if (!birthDate) return 0;

    let birth: Date | null = null;
    if (birthDate instanceof Date) {
        birth = birthDate;
    } else {
        const str = String(birthDate).trim();
        const dmyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
        if (dmyMatch) {
            const day = Number(dmyMatch[1]);
            const month = Number(dmyMatch[2]) - 1;
            const year = Number(dmyMatch[3]);
            birth = new Date(year, month, day);
        } else {
            const isoOrOther = new Date(str);
            if (!Number.isNaN(isoOrOther.getTime())) {
                birth = isoOrOther;
            }
        }
    }

    if (!birth || Number.isNaN(birth.getTime())) return 0;

    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12;
    months += now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) {
        months -= 1;
    }
    return Math.max(0, months);
};

// user hanya boleh memakai data anaknya sendiri (kader boleh semua)
const canUseBaby = async (userId: number, role: string, babyId: number): Promise<boolean> => {
    if (role === 'kader') return true;
    const babies = (await BabyModel.getAllByUser(userId)) as any[];
    return babies.some((b) => Number(b.id) === Number(babyId));
};

const isOverloadedError = (err: any): boolean => {
    const msg = String(err?.message || '').toLowerCase();
    return (
        err?.status === 503 ||
        err?.status === 429 ||
        err?.status === 404 ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('not supported') ||
        msg.includes('unavailable') ||
        msg.includes('resource_exhausted') ||
        msg.includes('high demand')
    );
};

const buildFallbackRecommendation = (params: {
    babyName: string;
    ageMonths: number;
    conditionStatus: string;
    allergyText: string;
    availableIngredients: string;
}): string => {
    const { babyName, ageMonths, conditionStatus, allergyText, availableIngredients } = params;
    const allergenList = allergyText
        .split(/[,;/\n]+/)
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean);

    const isSafe = (text: string) => {
        const lower = text.toLowerCase();
        return !allergenList.some((allergen) => lower.includes(allergen));
    };

    const proteinPool = [
        '50 gr daging ayam cincang',
        '50 gr ikan kembung/salmon cincang',
        '1 butir telur ayam',
        '50 gr tahu/tempe halus',
    ].filter(isSafe);

    const protein1 = proteinPool[0] || '50 gr tahu/tempe halus';
    const protein2 = proteinPool[1] || '50 gr tahu/tempe halus';

    const textureGuide =
        ageMonths <= 8
            ? 'lumat atau saring halus sesuai usia 6-8 bulan'
            : ageMonths <= 11
              ? 'cincang halus atau kasar sesuai usia 9-11 bulan'
              : 'potongan makanan keluarga sesuai usia 12-24 bulan';

    const under12Note =
        ageMonths < 12
            ? 'Tanpa tambahan gula, garam, madu, maupun penyedap rasa.'
            : 'Gunakan garam/gula secukupnya secara bijak dan hindari madu bila usia di bawah 12 bulan.';

    const isHighCalorieNeeded =
        conditionStatus.toLowerCase().includes('stunt') || conditionStatus.toLowerCase().includes('risiko');

    const tip1 = isHighCalorieNeeded
        ? `Tambahkan 1 sdm minyak/lemak sehat saat penyajian menu berkuah/tim agar kepadatan energi ${babyName} optimal.`
        : `Sajikan menu berkuah/tim selagi hangat agar aroma bahan tetap menggugah selera ${babyName}.`;

    const tip2 = allergyText
        ? `Pastikan seluruh peralatan masak bersih dan 100% bebas dari alergi: ${allergyText}.`
        : 'Variasikan kombinasi bahan di rumah secara bertahap agar anak terbiasa mengenal beragam rasa.';

    return `Nama Menu: Tim ${availableIngredients} & ${protein1.replace(/^\d+\s*(gr|butir)\s*/i, '')} untuk ${babyName}
Bahan-bahan:
- ${availableIngredients} (secukupnya, sekitar 30-50 gr)
- ${protein1}
- 2 sdm beras putih/sumber karbohidrat
- 1 sdt minyak kelapa/minyak sayur (${under12Note})
Cara Membuat:
1. Cuci bersih semua bahan, lalu potong kecil bahan utama dan protein.
2. Rebus atau kukus bersama beras hingga matang dan empuk.
3. Olah dengan tekstur ${textureGuide}.
Tips Penting: ${tip1}

Nama Menu: Kukusan Hangat ${availableIngredients} & ${protein2.replace(/^\d+\s*(gr|butir)\s*/i, '')} untuk ${babyName}
Bahan-bahan:
- ${availableIngredients} (secukupnya, sekitar 30-50 gr)
- ${protein2}
- 2 sdm kentang atau nasi tim
- 1 sdt lemak tambahan aman alergi (${under12Note})
Cara Membuat:
1. Siapkan dan bersihkan bahan yang tersedia di rumah.
2. Kukus atau masak hingga matang merata dan lunak.
3. Sesuaikan menjadi tekstur ${textureGuide} sebelum disajikan.
Tips Penting: ${tip2}`;
};

export const recommendMenu = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const role = res.locals.role;
    const { babyId, allergies } = req.body;
    const availableIngredients = String(req.body.availableIngredients ?? '').trim();

    if (!userId) {
        res.status(401).json({ success: false, message: 'Sesi pengguna tidak valid. Silakan login ulang.' });
        return;
    }

    if (!babyId || Number.isNaN(Number(babyId))) {
        res.status(400).json({ success: false, message: 'babyId wajib diisi dan berupa angka!' });
        return;
    }

    if (availableIngredients === '') {
        res.status(400).json({ success: false, message: 'Bahan di rumah wajib diisi!' });
        return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        console.error('GEMINI_API_KEY belum terisi di environment / .env');
        res.status(500).json({ success: false, message: 'Konfigurasi GEMINI_API_KEY belum tersedia di server.' });
        return;
    }

    try {
        const baby = await BabyModel.getById(Number(babyId));
        if (!baby) {
            res.status(404).json({ success: false, message: 'Data anak tidak ditemukan!' });
            return;
        }

        if (!(await canUseBaby(userId, role, baby.id))) {
            res.status(403).json({ success: false, message: 'Anda hanya bisa memakai data anak milik sendiri!' });
            return;
        }

        if (typeof allergies === 'string') {
            await BabyModel.updateAllergies(baby.id, allergies.trim());
        }

        const allergyText = typeof allergies === 'string' ? allergies.trim() : '';
        const ageMonths = calculateAgeInMonths(baby.birth_date, baby.age_months);
        const rawCondition = await AiModel.getLatestConditionByBaby(baby.id);
        const conditionStatus = rawCondition || baby.condition_note || 'Belum ada data pemeriksaan';

        const systemInstruction = `
Kamu adalah ahli gizi anak dan spesialis MPASI Kemenkes RI (Buku KIA).
Tugasmu membuat 2 rekomendasi resep MPASI yang aman dan bergizi.

ATURAN WAJIB:
1. Sesuaikan tekstur makanan dengan usia anak (6-8 bln: lumat/saring; 9-11 bln: cincang halus/kasar; 12-24 bln: makanan keluarga).
2. Jika usia anak di bawah 12 bulan, DILARANG KERAS menggunakan tambahan gula, garam, madu, atau penyedap rasa.
3. Pastikan resep 100% bebas dari bahan alergi yang disebutkan.
4. Gunakan bahasa Indonesia yang ramah dan mudah dipahami ibu rumah tangga.
5. Format output wajib berurutan: Nama Menu, Bahan-bahan (dengan takaran jelas), Cara Membuat, dan Tips Penting.
6. Setiap resep harus memiliki Tips Penting yang berbeda dan spesifik sesuai resepnya (jangan mengulang kalimat tips yang sama persis).
`;

        const userPrompt = `
Profil Anak: ${baby.full_name}, Usia ${ageMonths} bulan, Status Gizi: ${conditionStatus}.
Alergi: ${allergyText || 'Tidak ada'}.
Bahan tersedia di rumah: ${availableIngredients}.
Buatkan rekomendasi resep MPASI-nya.
`;

        const ai = new GoogleGenAI({ apiKey });
        const envModel = process.env.GEMINI_MODEL?.trim();
        const modelsToTry = envModel
            ? [envModel, 'gemini-2.5-flash', 'gemini-flash-latest']
            : ['gemini-2.5-flash', 'gemini-flash-latest'];

        const callGeminiWithRetry = async (maxRetriesPerModel = 2): Promise<string> => {
            let lastError: any;

            for (const modelName of modelsToTry) {
                for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
                    try {
                        const result = await ai.models.generateContent({
                            model: modelName,
                            contents: userPrompt,
                            config: {
                                systemInstruction,
                            },
                        });
                        if (result.text && result.text.trim() !== '') {
                            return result.text;
                        }
                        return 'Maaf, tidak ada respons dari AI.';
                    } catch (err: any) {
                        lastError = err;
                        console.error(`[${modelName}] percobaan ${attempt}/${maxRetriesPerModel} gagal:`, err?.message || err);

                        const msg = String(err?.message || '').toLowerCase();
                        if (err?.status === 404 || msg.includes('not found') || msg.includes('not supported')) {
                            break;
                        }

                        if (err?.status === 503 || err?.status === 429 || msg.includes('503') || msg.includes('429')) {
                            if (attempt < maxRetriesPerModel) {
                                await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
                                continue;
                            }
                            break;
                        }

                        throw err;
                    }
                }
            }

            throw lastError || new Error('Layanan AI sedang sibuk, silakan coba lagi.');
        };

        let aiResponse: string;
        try {
            aiResponse = await callGeminiWithRetry();
        } catch (aiErr: any) {
            if (!isOverloadedError(aiErr)) {
                throw aiErr;
            }
            console.warn('Model Gemini gagal/padat, menggunakan rekomendasi fallback.');
            aiResponse = buildFallbackRecommendation({
                babyName: baby.full_name,
                ageMonths,
                conditionStatus,
                allergyText,
                availableIngredients,
            });
        }

        const historyId = await AiModel.saveHistory(userId, availableIngredients, aiResponse, baby.id);

        res.status(200).json({
            success: true,
            data: {
                historyId,
                babyId: baby.id,
                babyName: baby.full_name,
                ageMonths,
                conditionStatus,
                recommendation: aiResponse,
            },
        });
    } catch (error: any) {
        console.error('Error recommendMenu:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mendapatkan rekomendasi dari AI.',
            detail: process.env.NODE_ENV !== 'production' ? error?.message : undefined,
        });
    }
};

export const getAiHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const rawBabyId = req.query?.babyId ?? req.query?.baby_id;
    const babyId =
        rawBabyId !== undefined &&
        rawBabyId !== null &&
        String(rawBabyId).trim() !== '' &&
        !Number.isNaN(Number(rawBabyId))
            ? Number(rawBabyId)
            : null;
    try {
        const history = await AiModel.getHistoryByUser(userId, babyId);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat AI.' });
    }
};

export const getAiHistoryDetail = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { id } = req.params;
    try {
        const detail = await AiModel.getHistoryById(Number(id));
        if (!detail || Number(detail.user_id) !== Number(userId)) {
            res.status(404).json({ success: false, message: 'Riwayat tidak ditemukan!' });
            return;
        }
        res.status(200).json({ success: true, data: detail });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail riwayat.' });
    }
};

export const deleteAiHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const id = Number(req.params.id);
    try {
        const detail = await AiModel.getHistoryById(id);
        if (!detail || Number(detail.user_id) !== Number(userId)) {
            res.status(404).json({ success: false, message: 'Riwayat tidak ditemukan!' });
            return;
        }
        await AiModel.deleteHistory(id);
        res.status(200).json({ success: true, message: 'Riwayat berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus riwayat.' });
    }
};