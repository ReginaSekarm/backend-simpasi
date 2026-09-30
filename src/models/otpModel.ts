import pool from '../config/db.js';

export const OtpModel = {
    create: async (userId: number, otpCode: string, purpose: 'register' | 'reset_password', expiresAt: Date) => {
        await pool.query(
            'INSERT INTO otp_verifications (user_id, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
            [userId, otpCode, purpose, expiresAt]
        );
    },

    findValidOtp: async (userId: number, otpCode: string, purpose: 'register' | 'reset_password') => {
        const [rows]: any = await pool.query(
            `SELECT * FROM otp_verifications
             WHERE user_id = ? AND otp_code = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW()
             ORDER BY id DESC LIMIT 1`,
            [userId, otpCode, purpose]
        );
        return rows[0];
    },

    markAsUsed: async (id: number) => {
        await pool.query('UPDATE otp_verifications SET is_used = TRUE WHERE id = ?', [id]);
    }
};