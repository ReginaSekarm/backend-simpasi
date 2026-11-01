import { Request, Response } from 'express';
import { put } from '@vercel/blob';

// cek isi file benar-benar JPG atau PNG (bukan sekadar nama atau tipe yang dikirim)
const isRealImage = (buffer: Buffer): boolean => {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    return isJpeg || isPng;
};

// unggah foto dari request ke Vercel Blob di folder tertentu, lalu kirim URL-nya
const uploadPhotoToBlob = async (req: Request, res: Response, folder: string, fileLabel: string): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ success: false, message: `${fileLabel} wajib dipilih!` });
        return;
    }
    if (!isRealImage(req.file.buffer)) {
        res.status(400).json({ success: false, message: 'File bukan foto JPG atau PNG yang valid!' });
        return;
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('BLOB_READ_WRITE_TOKEN belum diisi di file .env');
        res.status(500).json({ success: false, message: 'Penyimpanan foto belum dikonfigurasi.' });
        return;
    }

    try {
        const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
        const blob = await put(`${folder}/photo.${extension}`, req.file.buffer, {
            access: 'public',
            addRandomSuffix: true,
            contentType: req.file.mimetype
        });

        res.status(201).json({
            success: true,
            message: 'Foto berhasil diunggah!',
            data: { url: blob.url }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengunggah foto.' });
    }
};

// Kader: foto menu MPASI
export const uploadRecipePhoto = async (req: Request, res: Response): Promise<void> => {
    await uploadPhotoToBlob(req, res, 'recipes', 'Foto menu');
};

// Kader: foto profil
export const uploadProfilePhoto = async (req: Request, res: Response): Promise<void> => {
    await uploadPhotoToBlob(req, res, 'profiles', 'Foto profil');
};