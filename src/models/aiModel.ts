import pool from '../config/db.js';

export const AiModel = {
    // query = bahan yang diketik user (bukan seluruh prompt)
    saveHistory: async (userId: number, query: string, response: string, babyId?: number | null) => {
        const [result]: any = await pool.query(
            'INSERT INTO ai_search_history (user_id, baby_id, query, response) VALUES (?, ?, ?, ?)',
            [userId, babyId ?? null, query, response]
        );
        return result.insertId;
    },

    getHistoryByUser: async (userId: number, babyId?: number | null) => {
        if (babyId) {
            const [rows] = await pool.query(
                'SELECT * FROM ai_search_history WHERE user_id = ? AND baby_id = ? ORDER BY created_at DESC LIMIT 100',
                [userId, babyId]
            );
            return rows;
        }

        const [rows] = await pool.query(
            'SELECT * FROM ai_search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
            [userId]
        );
        return rows;
    },

    getHistoryById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM ai_search_history WHERE id = ?', [id]);
        return rows[0];
    },

    deleteHistory: async (id: number) => {
        await pool.query('DELETE FROM ai_search_history WHERE id = ?', [id]);
    },

    // ambil kondisi stunting terbaru dari pemeriksaan terakhir anak
    getLatestConditionByBaby: async (babyId: number) => {
        const [rows]: any = await pool.query(
            `SELECT condition_status FROM stunting_checkups
             WHERE baby_id = ? ORDER BY checkup_date DESC LIMIT 1`,
            [babyId]
        );
        return rows[0]?.condition_status || null;
    }
};