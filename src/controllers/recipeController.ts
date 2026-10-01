import { Request, Response } from 'express';
import { RecipeModel } from '../models/recipeModel.js';

// User: lihat resep yang terpublikasi, dengan filter
export const getPublishedRecipes = async (req: Request, res: Response): Promise<void> => {
    const { ageCategory, mainIngredient, search } = req.query;
    try {
        const recipes = await RecipeModel.getPublished({
            ageCategory: ageCategory as string,
            mainIngredient: mainIngredient as string,
            search: search as string
        });
        res.status(200).json({ success: true, data: recipes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar resep.' });
    }
};

// User & Kader: lihat detail satu resep
export const getRecipeDetail = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const recipe = await RecipeModel.getById(Number(id));
        if (!recipe) {
            res.status(404).json({ success: false, message: 'Resep tidak ditemukan!' });
            return;
        }
        res.status(200).json({ success: true, data: recipe });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail resep.' });
    }
};

// Kader: lihat resep miliknya sendiri (semua / draft / terpublikasi)
export const getMyRecipes = async (req: Request, res: Response): Promise<void> => {
    const kaderId = res.locals.userId;
    const status = req.query.status as 'draft' | 'terpublikasi' | undefined;
    try {
        const recipes = await RecipeModel.getAllByKader(kaderId, status);
        res.status(200).json({ success: true, data: recipes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil resep.' });
    }
};

// Kader: tambah resep baru
export const createRecipe = async (req: Request, res: Response): Promise<void> => {
    const kaderId = res.locals.userId;
    const {
        title, photoUrl, ageCategory, mainIngredient, ingredients, steps,
        proteinG, carbsG, fatG, calories, tips, storageTips, status
    } = req.body;

    try {
        const newId = await RecipeModel.create({
            createdBy: kaderId, title, photoUrl, ageCategory, mainIngredient, ingredients, steps,
            proteinG, carbsG, fatG, calories, tips, storageTips, status
        });
        res.status(201).json({
            success: true,
            message: status === 'draft' ? 'Resep berhasil disimpan sebagai draft!' : 'Resep berhasil dipublikasikan!',
            data: { id: newId }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menambahkan resep.' });
    }
};

// Kader: edit resep
export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
        title, photoUrl, ageCategory, mainIngredient, ingredients, steps,
        proteinG, carbsG, fatG, calories, tips, storageTips, status
    } = req.body;

    try {
        const recipe = await RecipeModel.getById(Number(id));
        if (!recipe) {
            res.status(404).json({ success: false, message: 'Resep tidak ditemukan!' });
            return;
        }

        await RecipeModel.update(Number(id), {
            title, photoUrl, ageCategory, mainIngredient, ingredients, steps,
            proteinG, carbsG, fatG, calories, tips, storageTips, status
        });
        res.status(200).json({ success: true, message: 'Resep berhasil diperbarui!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui resep.' });
    }
};

// Kader: hapus resep
export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const recipe = await RecipeModel.getById(Number(id));
        if (!recipe) {
            res.status(404).json({ success: false, message: 'Resep tidak ditemukan!' });
            return;
        }
        await RecipeModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Resep berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus resep.' });
    }
};