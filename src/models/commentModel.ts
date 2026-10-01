import pool from '../config/db.js';

export const CommentModel = {
    // ambil komentar utama (parent) beserta jumlah balasannya
    getByRecipeId: async (recipeId: number) => {
        const [rows] = await pool.query(
            `SELECT rc.id, rc.content, rc.created_at, u.full_name as user_name,
                    (SELECT COUNT(*) FROM recipe_comments WHERE parent_comment_id = rc.id) as reply_count
             FROM recipe_comments rc
             JOIN users u ON rc.user_id = u.id
             WHERE rc.recipe_id = ? AND rc.parent_comment_id IS NULL
             ORDER BY rc.created_at DESC`,
            [recipeId]
        );
        return rows;
    },

    // ambil balasan dari satu komentar
    getReplies: async (parentCommentId: number) => {
        const [rows] = await pool.query(
            `SELECT rc.id, rc.content, rc.created_at, u.full_name as user_name
             FROM recipe_comments rc
             JOIN users u ON rc.user_id = u.id
             WHERE rc.parent_comment_id = ?
             ORDER BY rc.created_at ASC`,
            [parentCommentId]
        );
        return rows;
    },

    create: async (recipeId: number, userId: number, content: string, parentCommentId?: number) => {
        const [result]: any = await pool.query(
            'INSERT INTO recipe_comments (recipe_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?)',
            [recipeId, userId, content, parentCommentId || null]
        );
        return result.insertId;
    },

    getById: async (id: number) => {
        const [rows]: any = await pool.query('SELECT * FROM recipe_comments WHERE id = ?', [id]);
        return rows[0];
    },

    remove: async (id: number) => {
        await pool.query('DELETE FROM recipe_comments WHERE id = ?', [id]);
    }
};