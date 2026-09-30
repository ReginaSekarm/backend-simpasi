import pool from '../config/db.js';

export const UserModel = {
    findByEmail: async (email: string) => {
        const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    findById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (fullName: string, email: string, phone: string, hashedPassword: string, role: 'user' | 'kader' = 'user') => {
        const [result]: any = await pool.query(
            'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [fullName, email, phone, hashedPassword, role]
        );
        return result.insertId;
    },

    verifyUser: async (id: number) => {
        await pool.query('UPDATE users SET is_verified = TRUE, terms_accepted_at = NOW() WHERE id = ?', [id]);
    },

    updatePassword: async (id: number, hashedPassword: string) => {
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    }
};