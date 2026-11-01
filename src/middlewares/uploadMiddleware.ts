import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const MAX_PHOTO_MB = 5; // sesuai desain: JPG/PNG, maks 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_PHOTO_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            cb(new Error('FORMAT_INVALID'));
            return;
        }
        cb(null, true);
    }
});

// field file di form harus bernama "image"
export const receiveRecipePhoto = (req: Request, res: Response, next: NextFunction): void => {
    upload.single('image')(req, res, (err: any) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                res.status(400).json({ success: false, message: `Ukuran foto maksimal ${MAX_PHOTO_MB} MB!` });
                return;
            }
            if (err.message === 'FORMAT_INVALID') {
                res.status(400).json({ success: false, message: 'Foto harus berformat JPG atau PNG!' });
                return;
            }
            res.status(400).json({ success: false, message: 'Gagal membaca foto yang diunggah!' });
            return;
        }
        next();
    });
};