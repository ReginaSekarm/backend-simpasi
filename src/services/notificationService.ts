import pool from '../config/db.js';
import { NotificationModel } from '../models/notificationModel.js';

const getFullName = async (userId: number): Promise<string> => {
    const [rows]: any = await pool.query('SELECT full_name FROM users WHERE id = ?', [userId]);
    return rows[0]?.full_name ?? 'Pengguna';
};

// KADER: ada komentar masuk di resep miliknya
export const notifyKaderNewComment = async (recipeId: number, commenterId: number): Promise<void> => {
    try {
        const [rows]: any = await pool.query('SELECT title, created_by FROM recipes WHERE id = ?', [recipeId]);
        const recipe = rows[0];
        if (!recipe || recipe.created_by === commenterId) return; // jangan notif ke diri sendiri

        const name = await getFullName(commenterId);
        await NotificationModel.create(
            recipe.created_by,
            'Komentar baru',
            `${name} berkomentar di resep "${recipe.title}"`,
            'komentar'
        );
    } catch (error) {
        console.error('Gagal membuat notifikasi komentar:', error);
    }
};

// Ada yang membalas komentar (bisa kader atau user lain)
// - pemilik komentar diberi tahu
// - kader pemilik resep juga diberi tahu (kalau bukan pembalasnya dan bukan pemilik komentar)
export const notifyCommentReply = async (commentOwnerId: number, recipeId: number, replierId: number): Promise<void> => {
    try {
        const [rows]: any = await pool.query('SELECT title, created_by FROM recipes WHERE id = ?', [recipeId]);
        const recipe = rows[0];
        if (!recipe) return;

        const replierName = await getFullName(replierId);

        if (commentOwnerId !== replierId) {
            await NotificationModel.create(
                commentOwnerId,
                'Balasan baru',
                `${replierName} membalas komentar Anda di resep "${recipe.title}"`,
                'balasan'
            );
        }

        if (recipe.created_by !== replierId && recipe.created_by !== commentOwnerId) {
            await NotificationModel.create(
                recipe.created_by,
                'Komentar baru',
                `${replierName} membalas sebuah komentar di resep "${recipe.title}"`,
                'komentar'
            );
        }
    } catch (error) {
        console.error('Gagal membuat notifikasi balasan:', error);
    }
};

// USER: resep baru dipublikasikan -> semua user terverifikasi
export const notifyAllUsersNewRecipe = async (recipeId: number): Promise<void> => {
    try {
        const [recipeRows]: any = await pool.query('SELECT title FROM recipes WHERE id = ?', [recipeId]);
        const recipe = recipeRows[0];
        if (!recipe) return;

        const [userRows]: any = await pool.query(
            `SELECT id FROM users WHERE role = 'user' AND is_verified = 1`
        );
        const userIds: number[] = userRows.map((row: any) => row.id);

        await NotificationModel.createMany(
            userIds,
            'Resep baru ditambahkan',
            `Resep "${recipe.title}" sudah tersedia`,
            'resep_baru'
        );
    } catch (error) {
        console.error('Gagal membuat notifikasi resep baru:', error);
    }
};