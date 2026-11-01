import { del } from '@vercel/blob';

const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// cek URL foto: harus https, dari Vercel Blob, ada di folder yang benar, dan berakhiran .jpg/.jpeg/.png
export const getBlobPhotoError = (imageUrl: unknown, folder: string): string | null => {
    let parsed: URL;
    try {
        parsed = new URL(String(imageUrl).trim());
    } catch {
        return 'URL foto tidak valid! Unggah foto lewat endpoint upload foto.';
    }
    if (parsed.protocol !== 'https:') return 'URL foto harus memakai https!';
    if (!parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return 'Foto harus diunggah lewat endpoint upload foto!';
    if (!parsed.pathname.startsWith(`/${folder}/`)) return 'Foto ini bukan hasil unggahan untuk keperluan ini!';

    const path = parsed.pathname.toLowerCase();
    const validExtension = IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
    if (!validExtension) return 'Foto harus berformat JPG atau PNG!';
    return null;
};

// hapus file lama di Vercel Blob. Kegagalan hanya dicatat, tidak menggagalkan permintaan utama.
export const deleteBlobSafely = async (url: string): Promise<void> => {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return; // hanya hapus file milik store kita
        await del(url);
    } catch (error) {
        console.error('Gagal menghapus foto lama di Vercel Blob:', error);
    }
};