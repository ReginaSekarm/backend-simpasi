import pool from '../config/db.js';

const CAN_EDIT_SQL = 'TIMESTAMPDIFF(HOUR, sc.created_at, NOW()) < 24';

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

export const CheckupModel = {
    getByBabyId: async (babyId: number) => {
        const [rows] = await pool.query(
            `SELECT sc.*,
                    DATE_FORMAT(sc.checkup_date, '%Y-%m-%d') AS checkup_date_str,
                    DATE_FORMAT(sc.next_checkup_date, '%d/%m/%Y') AS next_checkup_date_str,
                    (${CAN_EDIT_SQL}) AS can_edit,
                    b.full_name AS baby_name,
                    b.gender AS baby_gender,
                    b.birth_place AS baby_birth_place,
                    DATE_FORMAT(b.birth_date, '%d/%m/%Y') AS baby_birth_date_str,
                    COALESCE(b.parent_name, u.full_name) AS parent_name,
                    COALESCE(b.parent_email, u.email) AS parent_email
             FROM stunting_checkups sc
             LEFT JOIN babies b ON sc.baby_id = b.id
             LEFT JOIN users u ON b.user_id = u.id
             WHERE sc.baby_id = ?
             ORDER BY sc.checkup_date DESC, sc.id DESC`,
            [babyId]
        );
        return rows;
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query(
            `SELECT sc.*,
                    DATE_FORMAT(sc.checkup_date, '%Y-%m-%d') AS checkup_date_str,
                    DATE_FORMAT(sc.next_checkup_date, '%d/%m/%Y') AS next_checkup_date_str,
                    (${CAN_EDIT_SQL}) AS can_edit,
                    b.full_name AS baby_name,
                    b.gender AS baby_gender,
                    b.birth_place AS baby_birth_place,
                    DATE_FORMAT(b.birth_date, '%d/%m/%Y') AS baby_birth_date_str,
                    COALESCE(b.parent_name, u.full_name) AS parent_name,
                    COALESCE(b.parent_email, u.email) AS parent_email
             FROM stunting_checkups sc
             LEFT JOIN babies b ON sc.baby_id = b.id
             LEFT JOIN users u ON b.user_id = u.id
             WHERE sc.id = ?`,
            [id]
        );
        return rows[0];
    },

    create: async (data: {
        babyId: number;
        checkedBy: number;
        babyAgeMonths: number;
        checkupDate: string;
        weightKg: number;
        heightCm: number;
        headCircumferenceCm?: number | null;
        lilaCm?: number | null;
        kaderNotes?: string | null;
        recommendedFood?: string | null;
        conditionStatus: 'normal' | 'berisiko' | 'stunting';
        followUp?: string | null;
        nextCheckupDate?: string | null;
    }) => {
        const [result]: any = await pool.query(
            `INSERT INTO stunting_checkups
            (baby_id, checked_by, baby_age_months, checkup_date, weight_kg, height_cm,
             head_circumference_cm, lila_cm, kader_notes, recommended_food, condition_status, follow_up, next_checkup_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.babyId, data.checkedBy, data.babyAgeMonths, data.checkupDate,
                data.weightKg, data.heightCm, data.headCircumferenceCm ?? null, data.lilaCm ?? null,
                data.kaderNotes || null, data.recommendedFood || null, data.conditionStatus,
                data.followUp || null, data.nextCheckupDate || null
            ]
        );
        return result.insertId;
    },

    update: async (
        id: number,
        data: {
            babyAgeMonths: number;
            checkupDate: string;
            weightKg: number;
            heightCm: number;
            headCircumferenceCm?: number | null;
            lilaCm?: number | null;
            kaderNotes?: string | null;
            recommendedFood?: string | null;
            conditionStatus: 'normal' | 'berisiko' | 'stunting';
        }
    ) => {
        await pool.query(
            `UPDATE stunting_checkups SET
                baby_age_months = ?, checkup_date = ?, weight_kg = ?, height_cm = ?,
                head_circumference_cm = ?, lila_cm = ?, kader_notes = ?,
                recommended_food = ?, condition_status = ?
             WHERE id = ?`,
            [
                data.babyAgeMonths, data.checkupDate, data.weightKg, data.heightCm,
                data.headCircumferenceCm ?? null, data.lilaCm ?? null,
                data.kaderNotes || null, data.recommendedFood || null,
                data.conditionStatus, id
            ]
        );
    },

    remove: async (id: number) => {
        await pool.query('DELETE FROM stunting_checkups WHERE id = ?', [id]);
    },

    // untuk dashboard kader: hitung ringkasan keseluruhan
    getSummaryByKader: async (kaderId: number) => {
        const [totalBabies]: any = await pool.query(
            'SELECT COUNT(*) as total FROM babies'
        );

        const [needsMonitoring]: any = await pool.query(
            `SELECT COUNT(*) as total FROM babies 
             WHERE LOWER(condition_note) IN ('berisiko', 'stunting')`
        );

        const [totalCheckups]: any = await pool.query(
            'SELECT COUNT(*) as total FROM stunting_checkups WHERE checked_by = ?',
            [kaderId]
        );

        return {
            totalBabies: totalBabies[0]?.total ?? 0,
            needsMonitoring: needsMonitoring[0]?.total ?? 0,
            totalCheckups: totalCheckups[0]?.total ?? 0
        };
    },

    // aktivitas terbaru kader: gabungan pemeriksaan + resep, urut terbaru
    getRecentActivity: async (kaderId: number, limit: number = 50) => {
        const [checkupRows]: any = await pool.query(
            `SELECT sc.id, sc.condition_status, sc.baby_age_months, sc.created_at, b.full_name AS baby_name
             FROM stunting_checkups sc
             JOIN babies b ON sc.baby_id = b.id
             WHERE sc.checked_by = ?
             ORDER BY sc.created_at DESC
             LIMIT ?`,
            [kaderId, limit]
        );

        const checkups = checkupRows.map((r: any) => ({
            id: `checkup-${r.id}`,
            type: 'checkup' as const,
            text: `Memeriksa "${r.baby_name}" (${r.baby_age_months ?? 0} bulan)`,
            status: String(r.condition_status || 'normal').toLowerCase(),
            statusLabel: capitalize(String(r.condition_status || 'normal')),
            created_at: r.created_at,
        }));

        let recipes: any[] = [];
        try {
            const [recipeRows]: any = await pool.query(
                `SELECT id, title, status, created_at
                 FROM recipes
                 WHERE created_by = ?
                 ORDER BY created_at DESC
                 LIMIT ?`,
                [kaderId, limit]
            );
            recipes = recipeRows.map((r: any) => {
                const published = ['published', 'terpublikasi'].includes(String(r.status).toLowerCase());
                return {
                    id: `recipe-${r.id}`,
                    type: 'recipe' as const,
                    text: `Menambahkan resep "${r.title}"`,
                    status: published ? 'published' : 'draft',
                    statusLabel: published ? 'Terpublikasi' : 'Draft',
                    created_at: r.created_at,
                };
            });
        } catch (err) {
            console.warn('getRecentActivity: query resep dilewati ->', (err as Error).message);
        }

        return [...checkups, ...recipes]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
    }
};