import { Router } from 'express';
import {
    register,
    verifyRegisterOtp,
    login,
    forgotPassword,
    resetPassword
} from '../controllers/authController.js';
import {
    validateRegister,
    validateLogin,
    validateOtp,
    validateResetPassword
} from '../middlewares/validator.js';

const router = Router();

// AUTH ROUTES
router.post('/auth/register', validateRegister, register);
router.post('/auth/verify-otp', validateOtp, verifyRegisterOtp);
router.post('/auth/login', validateLogin, login);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', validateResetPassword, resetPassword);

export default router;