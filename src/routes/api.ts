import { Router } from 'express';
import {
    register, verifyRegisterOtp, login, forgotPassword, resetPassword
} from '../controllers/authController.js';
import {
    getMyBabies, createBaby, updateBaby, deleteBaby, getAllBabiesForKader
} from '../controllers/babyController.js';
import {
    getCheckupsByBaby, createCheckup, deleteCheckup, getKaderDashboardSummary, getKaderRecentActivity
} from '../controllers/checkupController.js';
import {
    getKaderProfile, updateKaderProfile, changePassword
} from '../controllers/kaderController.js';
import {
    getPublishedRecipes, getRecipeDetail, getMyRecipes, createRecipe, updateRecipe, deleteRecipe
} from '../controllers/recipeController.js';
import {
    getComments, getReplies, createComment, deleteComment
} from '../controllers/commentController.js';
import {
    getMyCollection, saveRecipe, unsaveRecipe
} from '../controllers/savedRecipeController.js';
import {
    getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification
} from '../controllers/notificationController.js';
import {
    recommendMenu, getAiHistory, getAiHistoryDetail
} from '../controllers/aiController.js';
import {
    validateRegister, validateLogin, validateOtp, validateResetPassword,
    validateBaby, validateCheckup, validateChangePassword, validateRecipe, validateComment, validateAiRequest
} from '../middlewares/validator.js';
import { verifyToken, requireKader } from '../middlewares/authMiddleware.js';

const router = Router();

// AUTH ROUTES
router.post('/auth/register', validateRegister, register);
router.post('/auth/verify-otp', validateOtp, verifyRegisterOtp);
router.post('/auth/login', validateLogin, login);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', validateResetPassword, resetPassword);

// BABY ROUTES (Protected)
router.get('/babies', verifyToken, getMyBabies);
router.post('/babies', verifyToken, validateBaby, createBaby);
router.put('/babies/:id', verifyToken, validateBaby, updateBaby);
router.delete('/babies/:id', verifyToken, deleteBaby);
router.get('/babies/all', verifyToken, requireKader, getAllBabiesForKader);

// CHECKUP ROUTES (Protected)
router.get('/babies/:babyId/checkups', verifyToken, getCheckupsByBaby);
router.post('/checkups', verifyToken, requireKader, validateCheckup, createCheckup);
router.delete('/checkups/:id', verifyToken, requireKader, deleteCheckup);

// KADER DASHBOARD
router.get('/kader/dashboard/summary', verifyToken, requireKader, getKaderDashboardSummary);
router.get('/kader/dashboard/activity', verifyToken, requireKader, getKaderRecentActivity);

// KADER PROFILE ROUTES
router.get('/kader/profile', verifyToken, requireKader, getKaderProfile);
router.put('/kader/profile', verifyToken, requireKader, updateKaderProfile);
router.put('/kader/change-password', verifyToken, requireKader, validateChangePassword, changePassword);

// RECIPE ROUTES
router.get('/recipes', getPublishedRecipes);
router.get('/recipes/:id', verifyToken, getRecipeDetail);
router.get('/kader/recipes', verifyToken, requireKader, getMyRecipes);
router.post('/recipes', verifyToken, requireKader, validateRecipe, createRecipe);
router.put('/recipes/:id', verifyToken, requireKader, validateRecipe, updateRecipe);
router.delete('/recipes/:id', verifyToken, requireKader, deleteRecipe);

// COMMENT ROUTES
router.get('/recipes/:recipeId/comments', getComments);
router.get('/comments/:commentId/replies', getReplies);
router.post('/recipes/:recipeId/comments', verifyToken, validateComment, createComment);
router.delete('/comments/:id', verifyToken, deleteComment);

// SAVED RECIPES (Koleksi Saya)
router.get('/collection', verifyToken, getMyCollection);
router.post('/collection', verifyToken, saveRecipe);
router.delete('/collection/:recipeId', verifyToken, unsaveRecipe);

// NOTIFICATION ROUTES
router.get('/notifications', verifyToken, getMyNotifications);
router.put('/notifications/:id/read', verifyToken, markNotificationAsRead);
router.put('/notifications/read-all', verifyToken, markAllNotificationsAsRead);
router.delete('/notifications/:id', verifyToken, deleteNotification);

// AI ROUTES
router.post('/ai/recommend-menu', verifyToken, validateAiRequest, recommendMenu);
router.get('/ai/history', verifyToken, getAiHistory);
router.get('/ai/history/:id', verifyToken, getAiHistoryDetail);

export default router;