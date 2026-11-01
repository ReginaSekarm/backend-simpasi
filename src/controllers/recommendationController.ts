import { Request, Response } from 'express';
import { BabyModel } from '../models/babyModel.js';
import { RecommendationModel } from '../models/recommendationModel.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const NO_ALLERGY_WORDS = ['tidak ada', 'tidak', '-', 'none', 'nihil'];

// umur dalam bulan penuh
const getAgeInMonths = (birthDate: unknown): number => {
    const birth = new Date(birthDate as string);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months -= 1;
    return Math.max(0, months);
};

// null = belum masuk usia MPASI
const getAgeCategory = (months: number): string | null => {
    if (months < 6) return null;
    if (months === 6) return '6';
    if (months <= 8) return '7-8';
    if (months <= 11) return '9-11';
    return '12+';
};

// "Udang, Telur" -> ['udang', 'telur']
const parseAllergies = (allergies: unknown): string[] => {
    return String(allergies ?? '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item !== '' && !NO_ALLERGY_WORDS.includes(item));
};

// User: rekomendasi menu untuk anaknya (kader boleh melihat untuk semua balita)
export const getMenuRecommendations = async (req: Request, res: Response): Promise<void> => {
    const babyId = Number(req.params.babyId);
    const userId = res.locals.userId;
    const role = res.locals.role;

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    try {
        const baby = await BabyModel.getById(babyId);
        if (!baby) {
            res.status(404).json({ success: false, message: 'Data anak tidak ditemukan!' });
            return;
        }
        if (role !== 'kader' && baby.user_id !== userId) {
            res.status(403).json({ success: false, message: 'Anda hanya bisa melihat rekomendasi untuk anak milik sendiri!' });
            return;
        }

        const ageMonths = getAgeInMonths(baby.birth_date);
        const ageCategory = getAgeCategory(ageMonths);
        const condition = (await RecommendationModel.getLatestCondition(babyId)) ?? 'normal';
        const focus = condition === 'normal' ? 'terbaru' : 'protein_tinggi';
        const allergens = parseAllergies(baby.allergies);

        const info = {
            babyId,
            babyName: baby.full_name,
            ageMonths,
            ageCategory,
            condition,
            focus,
            allergiesExcluded: allergens
        };

        if (ageCategory === null) {
            res.status(200).json({
                success: true,
                message: 'Anak belum memasuki usia MPASI (mulai 6 bulan).',
                info,
                data: []
            });
            return;
        }

        const recipes = await RecommendationModel.getRecipesByAge(ageCategory, condition !== 'normal');

        // buang resep yang judul atau bahannya mengandung alergen
        const safeRecipes = recipes.filter((recipe: any) => {
            const text = `${recipe.title} ${recipe.ingredients}`.toLowerCase();
            return !allergens.some((allergen) => text.includes(allergen));
        });

        res.status(200).json({
            success: true,
            message: safeRecipes.length === 0 ? 'Belum ada resep yang cocok untuk anak ini.' : 'Rekomendasi menu berhasil diambil.',
            info,
            data: safeRecipes.slice(0, limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil rekomendasi menu.' });
    }
};