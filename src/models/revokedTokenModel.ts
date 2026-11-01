import { createHash } from 'crypto';
import pool from '../config/db.js';

// simpan hash token, bukan token aslinya
export const hashToken = (token: string): string => {
    return createHash('sha256').update(token).digest('hex');
};

export const RevokedTokenModel = {
    add: async (tokenHash: string, expiresAt: Date) => {
        await pool.query(
            'INSERT IGNORE INTO revoked_tokens (token_hash, expires_at) VALUES (?, ?)',
            [tokenHash, expiresAt]
        );
    },

    exists: async (tokenHash: string): Promise<boolean> => {
        const [rows]: any = await pool.query(
            'SELECT id FROM revoked_tokens WHERE token_hash = ? LIMIT 1',
            [tokenHash]
        );
        return rows.length > 0;
    },

    // hapus catatan token yang memang sudah kedaluwarsa (tidak perlu disimpan lagi)
    deleteExpired: async () => {
        await pool.query('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
    }
};