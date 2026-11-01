import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { RevokedTokenModel, hashToken } from '../models/revokedTokenModel.js';

const DEFAULT_TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000; // 2 jam, sama dengan masa berlaku token saat login

// LOGOUT (user dan kader): token yang dipakai langsung dimatikan
export const logout = async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
        res.status(401).json({ success: false, message: 'Token tidak ditemukan!' });
        return;
    }

    try {
        const decoded = jwt.decode(token) as { exp?: number } | null;
        const expiresAt = decoded?.exp
            ? new Date(decoded.exp * 1000)
            : new Date(Date.now() + DEFAULT_TOKEN_LIFETIME_MS);

        await RevokedTokenModel.add(hashToken(token), expiresAt);
        await RevokedTokenModel.deleteExpired(); // bersihkan catatan lama

        res.status(200).json({ success: true, message: 'Berhasil keluar dari akun.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal keluar dari akun.' });
    }
};