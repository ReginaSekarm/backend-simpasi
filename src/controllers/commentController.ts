import { Request, Response } from 'express';
import { CommentModel } from '../models/commentModel.js';
import { notifyKaderNewComment, notifyCommentReply } from '../services/notificationService.js';

// batas waktu USER mengedit komentarnya sendiri: 24 jam (kader tanpa batas)
const USER_EDIT_LIMIT_SECONDS = 24 * 60 * 60;

export const getComments = async (req: Request, res: Response): Promise<void> => {
    const { recipeId } = req.params;
    try {
        const comments = await CommentModel.getByRecipeId(Number(recipeId));
        res.status(200).json({ success: true, data: comments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil komentar.' });
    }
};

export const getReplies = async (req: Request, res: Response): Promise<void> => {
    const { commentId } = req.params;
    try {
        const replies = await CommentModel.getReplies(Number(commentId));
        res.status(200).json({ success: true, data: replies });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil balasan.' });
    }
};

// Komentar utama (balasan lewat replyComment)
export const createComment = async (req: Request, res: Response): Promise<void> => {
    const { recipeId } = req.params;
    const userId = res.locals.userId;
    const { content } = req.body;

    try {
        const newId = await CommentModel.create(Number(recipeId), userId, content);

        // beri tahu kader pemilik resep ada komentar masuk
        await notifyKaderNewComment(Number(recipeId), userId);

        res.status(201).json({ success: true, message: 'Komentar berhasil ditambahkan!', data: { id: newId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menambahkan komentar.' });
    }
};

// Edit komentar
// - hanya pemilik komentar (user maupun kader)
// - user: maksimal 24 jam sejak dikirim
// - kader: tanpa batas waktu
export const updateComment = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const userId = res.locals.userId;
    const role = res.locals.role;
    const content = String(req.body.content ?? '').trim();

    try {
        const comment = await CommentModel.getById(id);
        if (!comment) {
            res.status(404).json({ success: false, message: 'Komentar tidak ditemukan!' });
            return;
        }

        if (comment.user_id !== userId) {
            res.status(403).json({ success: false, message: 'Anda hanya bisa mengedit komentar milik sendiri!' });
            return;
        }

        if (!content) {
            res.status(400).json({ success: false, message: 'Komentar tidak boleh kosong!' });
            return;
        }

        if (role !== 'kader') {
            const secondsAgo = await CommentModel.getSecondsSinceCreated(id);
            if (secondsAgo !== null && secondsAgo > USER_EDIT_LIMIT_SECONDS) {
                res.status(403).json({ success: false, message: 'Komentar hanya bisa diedit dalam 24 jam setelah dikirim!' });
                return;
            }
        }

        await CommentModel.update(id, content);
        res.status(200).json({ success: true, message: 'Komentar berhasil diperbarui!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui komentar.' });
    }
};

// Hapus komentar (tanpa batas waktu)
// - kader: boleh menghapus komentar mana pun
// - user: hanya komentarnya sendiri
export const deleteComment = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = res.locals.userId;
    const role = res.locals.role;

    try {
        const comment = await CommentModel.getById(Number(id));
        if (!comment) {
            res.status(404).json({ success: false, message: 'Komentar tidak ditemukan!' });
            return;
        }

        if (role !== 'kader' && comment.user_id !== userId) {
            res.status(403).json({ success: false, message: 'Anda hanya bisa menghapus komentar milik sendiri!' });
            return;
        }

        await CommentModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Komentar berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus komentar.' });
    }
};

// SEMUA AKUN (user maupun kader) MEMBALAS KOMENTAR
export const replyComment = async (req: Request, res: Response): Promise<void> => {
    const commentId = Number(req.params.commentId);
    const userId = res.locals.userId;
    const content = String(req.body.content).trim();

    try {
        const parentComment = await CommentModel.getById(commentId);
        if (!parentComment) {
            res.status(404).json({ success: false, message: 'Komentar tidak ditemukan!' });
            return;
        }

        // balasan tidak boleh dibalas lagi, cukup 1 tingkat
        if (parentComment.parent_comment_id !== null) {
            res.status(400).json({ success: false, message: 'Balasan tidak bisa dibalas lagi!' });
            return;
        }

        const newId = await CommentModel.create(parentComment.recipe_id, userId, content, commentId);

        // beri tahu pemilik komentar (dan kader pemilik resep)
        await notifyCommentReply(parentComment.user_id, parentComment.recipe_id, userId);

        res.status(201).json({ success: true, message: 'Balasan berhasil dikirim!', data: { id: newId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengirim balasan.' });
    }
};