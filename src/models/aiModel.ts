import pool from '../config/db.js';

export const AiModel = {
    saveHistory: async (userId: number, query: string, response: string) => {
        const [result]: any = await pool.query(
            'INSERT INTO ai_search_history (user_id, query, response) VALUES (?, ?, ?)',
            [userId, query, response]
        );
        return result.insertId;
    },

    getHistoryByUser: async (userId: number) => {
        const [rows] = await pool.query(
            'SELECT * FROM ai_search_history WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    getHistoryById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM ai_search_history WHERE id = ?', [id]);
        return rows[0];
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