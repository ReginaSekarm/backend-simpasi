import pool from '../config/db.js';

export const KaderModel = {
    getProfile: async (userId: number) => {
        const [rows]: any = await pool.query(
            `SELECT u.id, u.full_name, u.email, u.phone, u.nik, u.gender, u.birth_date,
                    kp.posyandu_name, kp.position, kp.region, kp.joined_at
             FROM users u
             LEFT JOIN kader_profiles kp ON kp.user_id = u.id
             WHERE u.id = ?`,
            [userId]
        );
        return rows[0];
    },

    hasProfile: async (userId: number) => {
        const [rows]: any = await pool.query('SELECT id FROM kader_profiles WHERE user_id = ?', [userId]);
        return rows.length > 0;
    },

    createProfile: async (userId: number, data: {
        posyanduName: string;
        position: string;
        region: string;
    }) => {
        await pool.query(
            'INSERT INTO kader_profiles (user_id, posyandu_name, position, region) VALUES (?, ?, ?, ?)',
            [userId, data.posyanduName, data.position, data.region]
        );
    },

    updateUserInfo: async (userId: number, data: {
        fullName?: string;
        email?: string;
        nik?: string;
        gender?: 'L' | 'P';
        birthDate?: string;
        phone?: string;
    }) => {
        await pool.query(
            `UPDATE users SET full_name = ?, email = ?, nik = ?, gender = ?, birth_date = ?, phone = ?
             WHERE id = ?`,
            [data.fullName, data.email, data.nik, data.gender, data.birthDate, data.phone, userId]
        );
    },

    updatePosyanduInfo: async (userId: number, data: {
        posyanduName: string;
        position: string;
        region: string;
    }) => {
        await pool.query(
            'UPDATE kader_profiles SET posyandu_name = ?, position = ?, region = ? WHERE user_id = ?',
            [data.posyanduName, data.position, data.region, userId]
        );
    }
};