import { Request, Response } from 'express';
import { SavedRecipeModel } from '../models/savedRecipeModel.js';

const parsePositiveId = (rawId: unknown): number | null => {
    if (typeof rawId === 'number') {
        return Number.isInteger(rawId) && rawId > 0 ? rawId : null;
    }
    if (typeof rawId === 'string') {
        const parsed = Number(rawId);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }
    return null;
};

export const getMyCollection = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const babyId = parsePositiveId(req.query?.babyId ?? req.query?.baby_id);
    try {
        const recipes = await SavedRecipeModel.getByUserId(userId, babyId);
        res.status(200).json({
            success: true,
            data: Array.isArray(recipes) ? recipes : [],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil koleksi.' });
    }
};

export const saveRecipe = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const recipeId = parsePositiveId(req.body?.recipeId ?? req.body?.recipe_id);
    const babyId = parsePositiveId(
        req.body?.babyId ?? req.body?.baby_id ?? req.query?.babyId ?? req.query?.baby_id
    );

    if (!recipeId) {
        res.status(400).json({ success: false, message: 'ID resep tidak valid!' });
        return;
    }

    try {
        const alreadySaved = await SavedRecipeModel.isSaved(userId, recipeId, babyId);
        if (alreadySaved) {
            res.status(409).json({ success: false, message: 'Resep sudah ada di koleksi!' });
            return;
        }
        await SavedRecipeModel.save(userId, recipeId, babyId);
        res.status(201).json({
            success: true,
            message: 'Resep berhasil disimpan ke koleksi!',
            data: { recipeId, babyId },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan resep.' });
    }
};

export const unsaveRecipe = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const recipeId = parsePositiveId(req.params.recipeId);
    const babyId = parsePositiveId(
        req.query?.babyId ?? req.query?.baby_id ?? req.body?.babyId ?? req.body?.baby_id
    );

    if (!recipeId) {
        res.status(400).json({ success: false, message: 'ID resep tidak valid!' });
        return;
    }

    try {
        await SavedRecipeModel.unsave(userId, recipeId, babyId);
        res.status(200).json({
            success: true,
            message: 'Resep dihapus dari koleksi!',
            data: { recipeId, babyId },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus dari koleksi.' });
    }
};