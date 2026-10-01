import { Request, Response } from 'express';
import { NotificationModel } from '../models/notificationModel.js';

export const getMyNotifications = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    try {
        const notifications = await NotificationModel.getByUserId(userId);
        const unreadCount = await NotificationModel.getUnreadCount(userId);
        res.status(200).json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengambil notifikasi.' });
    }
};

export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const notif = await NotificationModel.getById(Number(id));
        if (!notif) {
            res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan!' });
            return;
        }
        await NotificationModel.markAsRead(Number(id));
        res.status(200).json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui notifikasi.' });
    }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
    const userId = res.locals.userId;
    try {
        await NotificationModel.markAllAsRead(userId);
        res.status(200).json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui notifikasi.' });
    }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const notif = await NotificationModel.getById(Number(id));
        if (!notif) {
            res.status(404).json({ success: false, message: 'Notifikasi tidak ditemukan!' });
            return;
        }
        await NotificationModel.remove(Number(id));
        res.status(200).json({ success: true, message: 'Notifikasi berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal menghapus notifikasi.' });
    }
};