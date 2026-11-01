import pool from '../config/db.js';

type OtpPurpose = 'register' | 'reset_password';

export const OtpModel = {
    create: async (userId: number, otpCode: string, purpose: OtpPurpose, expiresAt: Date) => {
        await pool.query(
            'INSERT INTO otp_verifications (user_id, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
            [userId, otpCode, purpose, expiresAt]
        );
    },

    findValidOtp: async (userId: number, otpCode: string, purpose: OtpPurpose) => {
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
    },

    // matikan semua kode lama yang belum dipakai (dipanggil sebelum membuat kode baru)
    invalidateUnused: async (userId: number, purpose: OtpPurpose) => {
        await pool.query(
            'UPDATE otp_verifications SET is_used = TRUE WHERE user_id = ? AND purpose = ? AND is_used = FALSE',
            [userId, purpose]
        );
    },

    // berapa detik sejak kode terakhir dibuat (null kalau belum pernah)
    getSecondsSinceLatest: async (userId: number, purpose: OtpPurpose): Promise<number | null> => {
        const [rows]: any = await pool.query(
            `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS seconds_ago
             FROM otp_verifications
             WHERE user_id = ? AND purpose = ?
             ORDER BY id DESC LIMIT 1`,
            [userId, purpose]
        );
        return rows.length ? Number(rows[0].seconds_ago) : null;
    }
};