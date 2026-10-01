import pool from '../config/db.js';

export const NotificationModel = {
    getByUserId: async (userId: number) => {
        const [rows] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    getUnreadCount: async (userId: number) => {
        const [rows]: any = await pool.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );
        return rows[0].total;
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM notifications WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (userId: number, title: string, message: string, type?: string) => {
        const [result]: any = await pool.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [userId, title, message, type || null]
        );
        return result.insertId;
    },

    markAsRead: async (id: number) => {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
    },

    markAllAsRead: async (userId: number) => {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [userId]);
    },

    remove: async (id: number) => {
        await pool.query('DELETE FROM notifications WHERE id = ?', [id]);
    }
};