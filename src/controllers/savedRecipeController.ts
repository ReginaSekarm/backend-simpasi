import { Request, Response } from 'express';
import { SavedRecipeModel } from '../models/savedRecipeModel.js';

export const getMyCollection = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    try {
        const recipes = await SavedRecipeModel.getByUserId(userId);
        res.status(200).json({ success: true, data: recipes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil koleksi.' });
    }
};

export const saveRecipe = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { recipeId } = req.body;

    try {
        const alreadySaved = await SavedRecipeModel.isSaved(userId, recipeId);
        if (alreadySaved) {
            res.status(409).json({ success: false, message: 'Resep sudah ada di koleksi!' });
            return;
        }
        await SavedRecipeModel.save(userId, recipeId);
        res.status(201).json({ success: true, message: 'Resep berhasil disimpan ke koleksi!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menyimpan resep.' });
    }
};

export const unsaveRecipe = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    const { recipeId } = req.params;

    try {
        await SavedRecipeModel.unsave(userId, Number(recipeId));
        res.status(200).json({ success: true, message: 'Resep dihapus dari koleksi!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus dari koleksi.' });
    }
};