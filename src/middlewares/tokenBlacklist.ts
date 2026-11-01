import { Request, Response, NextFunction } from 'express';
import { RevokedTokenModel, hashToken } from '../models/revokedTokenModel.js';

// Menolak token yang sudah dipakai logout. Request tanpa token dibiarkan lewat,
// karena yang menolaknya nanti adalah verifyToken di route yang dilindungi.
export const rejectRevokedToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next();
        return;
    }

    const token = authHeader.slice(7).trim();
    try {
        const revoked = await RevokedTokenModel.exists(hashToken(token));
        if (revoked) {
            res.status(401).json({ success: false, message: 'Sesi sudah berakhir. Silakan login kembali.' });
            return;
        }
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error server.' });
    }
};