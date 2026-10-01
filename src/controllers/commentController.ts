import { Request, Response } from 'express';
import { CommentModel } from '../models/commentModel.js';

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

export const createComment = async (req: Request, res: Response): Promise<void> => {
    const { recipeId } = req.params;
    const userId = res.locals.userId;
    const { content, parentCommentId } = req.body;

    try {
        const newId = await CommentModel.create(Number(recipeId), userId, content, parentCommentId);
        res.status(201).json({ success: true, message: 'Komentar berhasil ditambahkan!', data: { id: newId } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menambahkan komentar.' });
    }
};

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const comment = await CommentModel.getById(Number(id));
        if (!comment) {
            res.status(404).json({ success: false, message: 'Komentar tidak ditemukan!' });
            return;
        }
        await CommentModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Komentar berhasil dihapus!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus komentar.' });
    }
};