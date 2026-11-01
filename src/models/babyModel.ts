import pool from '../config/db.js';

export const BabyModel = {
    getAllByUser: async (userId: number) => {
        const [rows] = await pool.query('SELECT * FROM babies WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return rows;
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM babies WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (data: {
        userId: number | null;
        addedBy: number;
        fullName: string;
        gender: 'L' | 'P';
        birthPlace: string;
        birthDate: string;
        parentName?: string;
        parentEmail?: string;
        weightKg: number;
        heightCm: number;
        headCircumferenceCm: number;
        lilaCm?: number | null;
        conditionNote?: string | null;
        allergies?: string;
    }) => {
        const [result]: any = await pool.query(
            `INSERT INTO babies
            (user_id, added_by, full_name, gender, birth_place, birth_date, parent_name, parent_email, weight_kg, height_cm, head_circumference_cm, lila_cm, condition_note, allergies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.userId, data.addedBy, data.fullName, data.gender, data.birthPlace, data.birthDate,
                data.parentName || null, data.parentEmail || null,
                data.weightKg, data.heightCm, data.headCircumferenceCm, data.lilaCm ?? null,
                data.conditionNote || null, data.allergies || null
            ]
        );
        return result.insertId;
    },

    // edit data anak (kolom allergies tidak disentuh, diubah lewat updateAllergies)
    update: async (id: number, data: {
        fullName: string;
        gender: 'L' | 'P';
        birthPlace: string;
        birthDate: string;
        weightKg: number;
        heightCm: number;
        headCircumferenceCm: number;
        lilaCm?: number | null;
        conditionNote?: string | null;
    }) => {
        await pool.query(
            `UPDATE babies SET
            full_name = ?, gender = ?, birth_place = ?, birth_date = ?, weight_kg = ?, height_cm = ?,
            head_circumference_cm = ?, lila_cm = ?, condition_note = ?
            WHERE id = ?`,
            [
                data.fullName, data.gender, data.birthPlace, data.birthDate, data.weightKg, data.heightCm,
                data.headCircumferenceCm, data.lilaCm ?? null, data.conditionNote || null, id
            ]
        );
    },

    updateAllergies: async (id: number, allergies: string) => {
        await pool.query('UPDATE babies SET allergies = ? WHERE id = ?', [allergies, id]);
    },

    remove: async (id: number) => {
        await pool.query('DELETE FROM babies WHERE id = ?', [id]);
    },

    getAllForKader: async (search?: string) => {
        if (search) {
            const [rows] = await pool.query(
                'SELECT * FROM babies WHERE full_name LIKE ? ORDER BY created_at DESC',
                [`%${search}%`]
            );
            return rows;
        }
        const [rows] = await pool.query('SELECT * FROM babies ORDER BY created_at DESC');
        return rows;
    }
};