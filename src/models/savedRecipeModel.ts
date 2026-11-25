import pool from '../config/db.js';

export const SavedRecipeModel = {
    getByUserId: async (userId: number, babyId?: number | null) => {
        if (babyId) {
            const [rows] = await pool.query(
                `SELECT r.*, sr.baby_id FROM saved_recipes sr
                 JOIN recipes r ON sr.recipe_id = r.id
                 WHERE sr.user_id = ? AND sr.baby_id = ?
                 ORDER BY sr.created_at DESC`,
                [userId, babyId]
            );
            return rows;
        }

        const [rows] = await pool.query(
            `SELECT r.*, sr.baby_id FROM saved_recipes sr
             JOIN recipes r ON sr.recipe_id = r.id
             WHERE sr.user_id = ?
             ORDER BY sr.created_at DESC`,
            [userId]
        );
        return rows;
    },

    isSaved: async (userId: number, recipeId: number, babyId?: number | null) => {
        if (babyId) {
            const [rows]: any = await pool.query(
                'SELECT id FROM saved_recipes WHERE user_id = ? AND recipe_id = ? AND baby_id = ?',
                [userId, recipeId, babyId]
            );
            return rows.length > 0;
        }

        const [rows]: any = await pool.query(
            'SELECT id FROM saved_recipes WHERE user_id = ? AND recipe_id = ? AND baby_id IS NULL',
            [userId, recipeId]
        );
        return rows.length > 0;
    },

    save: async (userId: number, recipeId: number, babyId?: number | null) => {
        await pool.query(
            'INSERT INTO saved_recipes (user_id, baby_id, recipe_id) VALUES (?, ?, ?)',
            [userId, babyId ?? null, recipeId]
        );
    },

    unsave: async (userId: number, recipeId: number, babyId?: number | null) => {
        if (babyId) {
            await pool.query(
                'DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ? AND baby_id = ?',
                [userId, recipeId, babyId]
            );
            return;
        }

        await pool.query(
            'DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?',
            [userId, recipeId]
        );
    }
};