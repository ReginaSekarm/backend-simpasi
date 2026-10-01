import pool from '../config/db.js';

export const CheckupModel = {
    getByBabyId: async (babyId: number) => {
        const [rows] = await pool.query(
            'SELECT * FROM stunting_checkups WHERE baby_id = ? ORDER BY checkup_date DESC',
            [babyId]
        );
        return rows;
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM stunting_checkups WHERE id = ?', [id]);
        return rows[0];
    },

    create: async (data: {
        babyId: number;
        checkedBy: number;
        babyAgeMonths: number;
        checkupDate: string;
        weightKg: number;
        heightCm: number;
        headCircumferenceCm?: number;
        lilaCm?: number;
        kaderNotes?: string;
        recommendedFood?: string;
        conditionStatus: 'normal' | 'berisiko' | 'stunting';
        followUp?: string;
        nextCheckupDate?: string;
    }) => {
        const [result]: any = await pool.query(
            `INSERT INTO stunting_checkups
            (baby_id, checked_by, baby_age_months, checkup_date, weight_kg, height_cm,
             head_circumference_cm, lila_cm, kader_notes, recommended_food, condition_status, follow_up, next_checkup_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.babyId, data.checkedBy, data.babyAgeMonths, data.checkupDate,
                data.weightKg, data.heightCm, data.headCircumferenceCm || null, data.lilaCm || null,
                data.kaderNotes || null, data.recommendedFood || null, data.conditionStatus,
                data.followUp || null, data.nextCheckupDate || null
            ]
        );
        return result.insertId;
    },

    remove: async (id: number) => {
        await pool.query('DELETE FROM stunting_checkups WHERE id = ?', [id]);
    },

    // untuk dashboard kader: hitung ringkasan
    getSummaryByKader: async (kaderId: number) => {
        const [totalBabies]: any = await pool.query(
            'SELECT COUNT(DISTINCT baby_id) as total FROM stunting_checkups WHERE checked_by = ?',
            [kaderId]
        );
        const [needsMonitoring]: any = await pool.query(
            `SELECT COUNT(DISTINCT baby_id) as total FROM stunting_checkups
             WHERE checked_by = ? AND condition_status != 'normal'`,
            [kaderId]
        );
        const [totalCheckups]: any = await pool.query(
            'SELECT COUNT(*) as total FROM stunting_checkups WHERE checked_by = ?',
            [kaderId]
        );
        return {
            totalBabies: totalBabies[0].total,
            needsMonitoring: needsMonitoring[0].total,
            totalCheckups: totalCheckups[0].total
        };
    },

    // aktivitas terbaru kader (gabungan pemeriksaan)
    getRecentActivity: async (kaderId: number, limit: number = 5) => {
        const [rows] = await pool.query(
            `SELECT sc.id, sc.checkup_date, sc.condition_status, sc.created_at, b.full_name as baby_name
             FROM stunting_checkups sc
             JOIN babies b ON sc.baby_id = b.id
             WHERE sc.checked_by = ?
             ORDER BY sc.created_at DESC LIMIT ?`,
            [kaderId, limit]
        );
        return rows;
    }
};