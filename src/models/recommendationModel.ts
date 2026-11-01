import pool from '../config/db.js';

export const RecommendationModel = {
    // kondisi dari pemeriksaan terakhir (null kalau anak belum pernah diperiksa)
    getLatestCondition: async (babyId: number): Promise<string | null> => {
        const [rows]: any = await pool.query(
            `SELECT condition_status FROM stunting_checkups
             WHERE baby_id = ?
             ORDER BY checkup_date DESC, id DESC
             LIMIT 1`,
            [babyId]
        );
        return rows.length ? rows[0].condition_status : null;
    },

    // resep terpublikasi untuk satu kategori usia
    // highProtein = true -> urut protein tertinggi; false -> urut terbaru
    getRecipesByAge: async (ageCategory: string, highProtein: boolean) => {
        const orderBy = highProtein
            ? 'protein_g DESC, calories DESC, created_at DESC'
            : 'created_at DESC';
        const [rows]: any = await pool.query(
            `SELECT * FROM recipes
             WHERE status = 'terpublikasi' AND age_category = ?
             ORDER BY ${orderBy}`,
            [ageCategory]
        );
        return rows;
    }
};