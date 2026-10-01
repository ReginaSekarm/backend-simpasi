import pool from '../config/db.js';

export const SavedRecipeModel = {
    getByUserId: async (userId: number) => {
        const [rows] = await pool.query(
            `SELECT r.* FROM saved_recipes sr
             JOIN recipes r ON sr.recipe_id = r.id
             WHERE sr.user_id = ?
             ORDER BY sr.created_at DESC`,
            [userId]
        );
        return rows;
    },

    isSaved: async (userId: number, recipeId: number) => {
        const [rows]: any = await pool.query(
            'SELECT id FROM saved_recipes WHERE user_id = ? AND recipe_id = ?',
            [userId, recipeId]
        );
        return rows.length > 0;
    },

    save: async (userId: number, recipeId: number) => {
        await pool.query(
            'INSERT INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)',
            [userId, recipeId]
        );
    },

    unsave: async (userId: number, recipeId: number) => {
        await pool.query(
            'DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?',
            [userId, recipeId]
        );
    }
};