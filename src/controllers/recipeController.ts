import { Request, Response } from 'express';
import { RecipeModel, FOOD_CATEGORY_KEYWORDS } from '../models/recipeModel.js';
import { notifyAllUsersNewRecipe } from '../services/notificationService.js';

const AGE_CATEGORIES = ['6', '7-8', '9-11', '12+'];

// User: lihat resep yang terpublikasi, dengan filter usia, bahan makanan, dan pencarian nama
export const getPublishedRecipes = async (req: Request, res: Response): Promise<void> => {
    const ageCategory = String(req.query.ageCategory ?? '').trim();
    const search = String(req.query.search ?? '').trim();

    // bahan bisa "ayam,telur" atau bahan=ayam&bahan=telur
    const rawBahan = req.query.bahan;
    const bahanList: string[] = (Array.isArray(rawBahan) ? rawBahan : String(rawBahan ?? '').split(','))
        .map((item) => String(item).trim().toLowerCase())
        .filter((item) => item !== '');

    // "semua" atau kosong = tanpa filter usia
    const useAgeFilter = ageCategory !== '' && ageCategory.toLowerCase() !== 'semua';
    if (useAgeFilter && !AGE_CATEGORIES.includes(ageCategory)) {
        res.status(400).json({ success: false, message: 'Usia harus 6, 7-8, 9-11, atau 12+ bulan!' });
        return;
    }

    const validBahan = Object.keys(FOOD_CATEGORY_KEYWORDS);
    const invalidBahan = bahanList.filter((item) => !validBahan.includes(item));
    if (invalidBahan.length > 0) {
        res.status(400).json({
            success: false,
            message: `Bahan tidak dikenal: ${invalidBahan.join(', ')}. Pilihan: ${validBahan.join(', ')}`
        });
        return;
    }

    try {
        const recipes = await RecipeModel.getPublished({
            ageCategory: useAgeFilter ? ageCategory : undefined,
            search: search || undefined,
            bahan: bahanList
        });
        res.status(200).json({
            success: true,
            filters: { ageCategory: useAgeFilter ? ageCategory : 'semua', bahan: bahanList, search },
            data: recipes
        });
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

// Kader: lihat resep miliknya sendiri (semua / draft / terpublikasi), bisa dicari berdasarkan nama
export const getMyRecipes = async (req: Request, res: Response): Promise<void> => {
    const kaderId = res.locals.userId;
    const status = req.query.status as 'draft' | 'terpublikasi' | undefined;
    const search = String(req.query.search ?? '').trim();

    if (status !== undefined && !['draft', 'terpublikasi'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status harus draft atau terpublikasi!' });
        return;
    }

    try {
        const recipes = await RecipeModel.getAllByKader(kaderId, status, search || undefined);
        const counts = await RecipeModel.getCountsByKader(kaderId);
        res.status(200).json({ success: true, data: recipes, counts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil resep.' });
    }
};

// Kader: tambah resep baru
export const createRecipe = async (req: Request, res: Response): Promise<void> => {
    const kaderId = res.locals.userId;
    const {
        title, photoUrl, ageCategory, ingredients, steps,
        proteinG, carbsG, fatG, calories, tips, storageTips, status
    } = req.body;

    try {
        const newId = await RecipeModel.create({
            createdBy: kaderId, title, photoUrl, ageCategory, ingredients, steps,
            proteinG, carbsG, fatG, calories, tips, storageTips, status
        });

        // resep langsung terpublikasi -> beri tahu semua user
        if (status === 'terpublikasi') {
            await notifyAllUsersNewRecipe(newId);
        }

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

// Kader: edit resep (hanya resep miliknya sendiri)
export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
        title, photoUrl, ageCategory, ingredients, steps,
        proteinG, carbsG, fatG, calories, tips, storageTips, status
    } = req.body;

    try {
        const recipe = await RecipeModel.getById(Number(id));
        if (!recipe) {
            res.status(404).json({ success: false, message: 'Resep tidak ditemukan!' });
            return;
        }
        if (recipe.created_by !== res.locals.userId) {
            res.status(403).json({ success: false, message: 'Anda hanya bisa mengubah resep milik sendiri!' });
            return;
        }

        await RecipeModel.update(Number(id), {
            title, photoUrl, ageCategory, ingredients, steps,
            proteinG, carbsG, fatG, calories, tips, storageTips, status
        });

        // baru dipublikasikan (sebelumnya draft) -> beri tahu semua user
        if (recipe.status !== 'terpublikasi' && status === 'terpublikasi') {
            await notifyAllUsersNewRecipe(Number(id));
        }

        res.status(200).json({ success: true, message: 'Resep berhasil diperbarui!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui resep.' });
    }
};

// Kader: hapus resep (hanya resep miliknya sendiri)
export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const recipe = await RecipeModel.getById(Number(id));
        if (!recipe) {
            res.status(404).json({ success: false, message: 'Resep tidak ditemukan!' });
            return;
        }
        if (recipe.created_by !== res.locals.userId) {
            res.status(403).json({ success: false, message: 'Anda hanya bisa menghapus resep milik sendiri!' });
            return;
        }
        await RecipeModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Resep berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus resep.' });
    }
};