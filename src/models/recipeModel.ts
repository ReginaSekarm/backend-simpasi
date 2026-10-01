import pool from '../config/db.js';

export const RecipeModel = {
    getPublished: async (filters?: { ageCategory?: string; mainIngredient?: string; search?: string }) => {
        let query = `SELECT * FROM recipes WHERE status = 'terpublikasi'`;
        const params: any[] = [];

        if (filters?.ageCategory) {
            query += ' AND age_category = ?';
            params.push(filters.ageCategory);
        }
        if (filters?.mainIngredient) {
            query += ' AND main_ingredient = ?';
            params.push(filters.mainIngredient);
        }
        if (filters?.search) {
            query += ' AND title LIKE ?';
            params.push(`%${filters.search}%`);
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(query, params);
        return rows;
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM recipes WHERE id = ?', [id]);
        return rows[0];
    },

    // kader: lihat resep sesuai status (semua/draft/terpublikasi), dan hanya miliknya sendiri
    getAllByKader: async (kaderId: number, status?: 'draft' | 'terpublikasi') => {
        let query = 'SELECT * FROM recipes WHERE created_by = ?';
        const params: any[] = [kaderId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(query, params);
        return rows;
    },

    create: async (data: {
        createdBy: number;
        title: string;
        photoUrl?: string;
        ageCategory?: string;
        mainIngredient?: string;
        ingredients: string;
        steps: string;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
        calories?: number;
        tips?: string;
        storageTips?: string;
        status: 'draft' | 'terpublikasi';
    }) => {
        const [result]: any = await pool.query(
            `INSERT INTO recipes
            (created_by, title, photo_url, age_category, main_ingredient, ingredients, steps,
             protein_g, carbs_g, fat_g, calories, tips, storage_tips, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.createdBy, data.title, data.photoUrl || null, data.ageCategory || null,
                data.mainIngredient || null, data.ingredients, data.steps,
                data.proteinG || null, data.carbsG || null, data.fatG || null, data.calories || null,
                data.tips || null, data.storageTips || null, data.status
            ]
        );
        return result.insertId;
    },

    update: async (id: number, data: {
        title: string;
        photoUrl?: string;
        ageCategory?: string;
        mainIngredient?: string;
        ingredients: string;
        steps: string;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
        calories?: number;
        tips?: string;
        storageTips?: string;
        status: 'draft' | 'terpublikasi';
    }) => {
        await pool.query(
            `UPDATE recipes SET
            title = ?, photo_url = ?, age_category = ?, main_ingredient = ?, ingredients = ?, steps = ?,
            protein_g = ?, carbs_g = ?, fat_g = ?, calories = ?, tips = ?, storage_tips = ?, status = ?
            WHERE id = ?`,
            [
                data.title, data.photoUrl || null, data.ageCategory || null, data.mainIngredient || null,
                data.ingredients, data.steps, data.proteinG || null, data.carbsG || null, data.fatG || null,
                data.calories || null, data.tips || null, data.storageTips || null, data.status, id
            ]
        );
    },

    remove: async (id: number) => {
        await pool.query('DELETE FROM recipes WHERE id = ?', [id]);
    }
};