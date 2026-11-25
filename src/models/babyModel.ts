import pool from '../config/db.js';

// ================= DATE HELPER (BE <-> DB) =================
function formatDateForDB(dateStr: string): string {
    if (!dateStr) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let d = parts[0] || '';
        let m = parts[1] || '';
        let y = parts[2] || '';
        
        if (y.length === 2) {
            y = '20' + y;
        }
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr;
}

function formatDateForFE(dateVal: any): string {
    if (!dateVal) return '';
    
    let str = dateVal;
    if (dateVal instanceof Date) {
        const year = dateVal.getFullYear();
        const month = String(dateVal.getMonth() + 1).padStart(2, '0');
        const day = String(dateVal.getDate()).padStart(2, '0');
        str = `${year}-${month}-${day}`;
    }

    if (typeof str === 'string' && str.includes('-')) {
        const parts = str.split('T')[0]?.split('-');
        if (parts && parts.length === 3) {
            const [y, m, d] = parts;
            return `${d}/${m}/${y}`;
        }
    }
    return str;
}

export const BabyModel = {
    getAllByUser: async (userId: number) => {
        const [rows]: any = await pool.query(
            `SELECT b.*,
                    DATE_FORMAT(b.birth_date, '%d/%m/%Y') AS birth_date_str,
                    TIMESTAMPDIFF(MONTH, b.birth_date, CURDATE()) AS age_months,
                    COALESCE(b.parent_name, u.full_name) AS parent_name,
                    COALESCE(b.parent_email, u.email) AS parent_email
             FROM babies b
             LEFT JOIN users u ON b.user_id = u.id
             WHERE b.user_id = ?
             ORDER BY b.created_at DESC`, 
            [userId]
        );
        return rows.map((baby: any) => ({
            ...baby,
            birth_date: formatDateForFE(baby.birth_date),
            birth_date_str: baby.birth_date_str || formatDateForFE(baby.birth_date),
            age_months: baby.age_months ?? 0
        }));
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query(
            `SELECT b.*,
                    DATE_FORMAT(b.birth_date, '%d/%m/%Y') AS birth_date_str,
                    TIMESTAMPDIFF(MONTH, b.birth_date, CURDATE()) AS age_months,
                    COALESCE(b.parent_name, u.full_name) AS parent_name,
                    COALESCE(b.parent_email, u.email) AS parent_email
             FROM babies b
             LEFT JOIN users u ON b.user_id = u.id
             WHERE b.id = ?`, 
            [id]
        );
        if (!rows[0]) return null;
        return {
            ...rows[0],
            birth_date: formatDateForFE(rows[0].birth_date),
            birth_date_str: rows[0].birth_date_str || formatDateForFE(rows[0].birth_date),
            age_months: rows[0].age_months ?? 0
        };
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
        const formattedBirthDate = formatDateForDB(data.birthDate || '');

        const [result]: any = await pool.query(
            `INSERT INTO babies
            (user_id, added_by, full_name, gender, birth_place, birth_date, parent_name, parent_email, weight_kg, height_cm, head_circumference_cm, lila_cm, condition_note, allergies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data.userId, data.addedBy, data.fullName, data.gender, data.birthPlace, formattedBirthDate,
                data.parentName || null, data.parentEmail || null,
                data.weightKg, data.heightCm, data.headCircumferenceCm, data.lilaCm ?? null,
                data.conditionNote || null, data.allergies || null
            ]
        );
        return result.insertId;
    },

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
        const formattedBirthDate = formatDateForDB(data.birthDate || '');

        await pool.query(
            `UPDATE babies SET
            full_name = ?, gender = ?, birth_place = ?, birth_date = ?, weight_kg = ?, height_cm = ?,
            head_circumference_cm = ?, lila_cm = ?, condition_note = ?
            WHERE id = ?`,
            [
                data.fullName, data.gender, data.birthPlace, formattedBirthDate, data.weightKg, data.heightCm,
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
        let rows: any;
        if (search) {
            [rows] = await pool.query(
                `SELECT b.*,
                        DATE_FORMAT(b.birth_date, '%d/%m/%Y') AS birth_date_str,
                        TIMESTAMPDIFF(MONTH, b.birth_date, CURDATE()) AS age_months,
                        COALESCE(b.parent_name, u.full_name) AS parent_name,
                        COALESCE(b.parent_email, u.email) AS parent_email
                 FROM babies b
                 LEFT JOIN users u ON b.user_id = u.id
                 WHERE b.full_name LIKE ?
                 ORDER BY b.created_at DESC`,
                [`%${search}%`]
            );
        } else {
            [rows] = await pool.query(
                `SELECT b.*,
                        DATE_FORMAT(b.birth_date, '%d/%m/%Y') AS birth_date_str,
                        TIMESTAMPDIFF(MONTH, b.birth_date, CURDATE()) AS age_months,
                        COALESCE(b.parent_name, u.full_name) AS parent_name,
                        COALESCE(b.parent_email, u.email) AS parent_email
                 FROM babies b
                 LEFT JOIN users u ON b.user_id = u.id
                 ORDER BY b.created_at DESC`
            );
        }
        
        return rows.map((baby: any) => ({
            ...baby,
            birth_date: formatDateForFE(baby.birth_date),
            birth_date_str: baby.birth_date_str || formatDateForFE(baby.birth_date),
            age_months: baby.age_months ?? 0
        }));
    }
};