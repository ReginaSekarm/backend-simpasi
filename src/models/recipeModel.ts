import pool from '../config/db.js';

// true  = resep harus memuat SEMUA bahan yang dipilih
// false = resep cukup memuat SALAH SATU bahan yang dipilih
const MATCH_ALL_SELECTED = false;

// kata kunci untuk tiap kategori bahan pada filter menu
export const FOOD_CATEGORY_KEYWORDS: Record<string, string[]> = {
    ayam: ['ayam'],
    daging: ['daging', 'sapi', 'kambing', 'bebek'],
    ikan: ['ikan', 'salmon', 'tuna', 'kembung', 'lele', 'tongkol', 'teri', 'nila', 'gurame', 'bandeng', 'patin'],
    seafood: ['seafood', 'udang', 'cumi', 'kerang', 'kepiting', 'rajungan'],
    telur: ['telur'],
    umbi: ['ubi', 'kentang', 'singkong', 'talas'],
    sayuran: ['sayur', 'sayuran', 'bayam', 'brokoli', 'wortel', 'labu', 'buncis', 'kangkung', 'sawi', 'tomat', 'kubis', 'kembang kol', 'zucchini', 'timun', 'jagung', 'kelor'],
    buah: ['buah', 'pisang', 'apel', 'pepaya', 'alpukat', 'mangga', 'jeruk', 'melon', 'semangka', 'stroberi'],
    kacang: ['kacang', 'tahu', 'tempe', 'kedelai', 'edamame']
};

// ubah teks jadi huruf kecil, tanda baca jadi spasi, diapit spasi
// contoh: "Ubi-ubian, Wortel" -> " ubi ubian wortel "
const normalizeText = (text: unknown): string => {
    let result = '';
    for (const char of String(text ?? '').toLowerCase()) {
        result += char >= 'a' && char <= 'z' ? char : ' ';
    }
    return ' ' + result.split(' ').filter((word) => word !== '').join(' ') + ' ';
};

// cek apakah resep memuat salah satu kata kunci dari kategori (cocok per kata utuh)
const matchesCategory = (recipe: any, categoryKey: string): boolean => {
    const text = normalizeText(`${recipe.title} ${recipe.ingredients}`);
    const keywords = FOOD_CATEGORY_KEYWORDS[categoryKey] ?? [];
    return keywords.some((keyword) => text.includes(' ' + keyword + ' '));
};

export const RecipeModel = {
    // user: resep terpublikasi, bisa difilter usia, bahan makanan, dan nama
    getPublished: async (filters?: { ageCategory?: string | undefined; search?: string | undefined; bahan?: string[] | undefined }) => {
        let query = `SELECT * FROM recipes WHERE status = 'terpublikasi'`;
        const params: any[] = [];

        if (filters?.ageCategory) {
            query += ' AND age_category = ?';
            params.push(filters.ageCategory);
        }
        if (filters?.search) {
            query += ' AND title LIKE ?';
            params.push(`%${filters.search}%`);
        }

        query += ' ORDER BY created_at DESC';
        const [rows]: any = await pool.query(query, params);

        const selected = filters?.bahan ?? [];
        if (selected.length === 0) return rows;

        return rows.filter((recipe: any) =>
            MATCH_ALL_SELECTED
                ? selected.every((key) => matchesCategory(recipe, key))
                : selected.some((key) => matchesCategory(recipe, key))
        );
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM recipes WHERE id = ?', [id]);
        return rows[0];
    },

    // kader: lihat resep miliknya, bisa difilter status dan dicari berdasarkan nama
    getAllByKader: async (kaderId: number, status?: 'draft' | 'terpublikasi', search?: string) => {
        let query = 'SELECT * FROM recipes WHERE created_by = ?';
        const params: any[] = [kaderId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND title LIKE ?';
            params.push(`%${search}%`);
        }

        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.query(query, params);
        return rows;
    },

    // jumlah resep kader per tab (Semua / Draft / Terpublikasi), tidak terpengaruh pencarian
    getCountsByKader: async (kaderId: number) => {
        const [rows]: any = await pool.query(
            `SELECT
                COUNT(*) AS total,
                COALESCE(SUM(status = 'draft'), 0) AS draft,
                COALESCE(SUM(status = 'terpublikasi'), 0) AS terpublikasi
             FROM recipes WHERE created_by = ?`,
            [kaderId]
        );
        return {
            all: Number(rows[0].total),
            draft: Number(rows[0].draft),
            terpublikasi: Number(rows[0].terpublikasi)
        };
    },

    create: async (data: {
        createdBy: number;
        title: string;
        photoUrl?: string;
        ageCategory?: string;
        ingredients: string;
        steps: string;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
        calories?: number;
        tips?: string;
        storageTips?: string;
        status: 'draft' | 'terpublikasi';
    }) => {
        const [result]: any = await pool.query(
            `INSERT INTO recipes
            (created_by, title, photo_url, age_category, ingredients, steps,
             protein_g, carbs_g, fat_g, calories, tips, storage_tips, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.createdBy, data.title, data.photoUrl || null, data.ageCategory || null,
                data.ingredients, data.steps,
                data.proteinG ?? null, data.carbsG ?? null, data.fatG ?? null, data.calories ?? null,
                data.tips || null, data.storageTips || null, data.status
            ]
        );
        return result.insertId;
    },

    update: async (id: number, data: {
        title: string;
        photoUrl?: string;
        ageCategory?: string;
        ingredients: string;
        steps: string;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
        calories?: number;
        tips?: string;
        storageTips?: string;
        status: 'draft' | 'terpublikasi';
    }) => {
        await pool.query(
            `UPDATE recipes SET
            title = ?, photo_url = ?, age_category = ?, ingredients = ?, steps = ?,
            protein_g = ?, carbs_g = ?, fat_g = ?, calories = ?, tips = ?, storage_tips = ?, status = ?
            WHERE id = ?`,
            [
                data.title, data.photoUrl || null, data.ageCategory || null,
                data.ingredients, data.steps, data.proteinG ?? null, data.carbsG ?? null, data.fatG ?? null,
                data.calories ?? null, data.tips || null, data.storageTips || null, data.status, id
            ]
        );
    },

    remove: async (id: number) => {
        await pool.query('DELETE FROM recipes WHERE id = ?', [id]);
    }
};