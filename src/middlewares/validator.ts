import { Request, Response, NextFunction } from 'express';
import { getBlobPhotoError } from '../services/blobService.js';

// ---------- Aturan validasi ----------
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/; // min 8 karakter, 1 huruf besar, 1 angka
const OTP_REGEX = /^\d{4}$/;
const PASSWORD_MESSAGE = 'Kata sandi minimal 8 karakter, mengandung 1 huruf besar dan 1 angka!';

// ---------- Aturan balita ----------
const MAX_BABY_NAME_LENGTH = 100;
const MAX_BIRTH_PLACE_LENGTH = 100;
const BABY_CONDITIONS = ['normal', 'berisiko', 'stunting'];

// batas angka yang masuk akal untuk balita (ubah kalau perlu)
type MeasureLimit = { min: number; max: number; label: string };
const WEIGHT_LIMIT: MeasureLimit = { min: 1, max: 30, label: 'Berat badan (kg)' };
const HEIGHT_LIMIT: MeasureLimit = { min: 30, max: 130, label: 'Tinggi badan (cm)' };
const HEAD_LIMIT: MeasureLimit = { min: 20, max: 60, label: 'Lingkar kepala (cm)' };
const LILA_LIMIT: MeasureLimit = { min: 5, max: 30, label: 'LiLA (cm)' };

// ---------- Aturan resep ----------
const AGE_CATEGORIES = ['6', '7-8', '9-11', '12+'];

const isValidEmail = (value: unknown): boolean =>
    typeof value === 'string' && EMAIL_REGEX.test(value.trim());

const isValidPassword = (value: unknown): boolean =>
    typeof value === 'string' && PASSWORD_REGEX.test(value);

// cek angka tidak kosong, bukan huruf, dan tidak minus
const isValidNumber = (value: unknown): boolean => {
    if (value === undefined || value === null || String(value).trim() === '') return false;
    const num = Number(value);
    return !isNaN(num) && num >= 0;
};

// ubah "6,4" atau "6.4" jadi angka 6.4, null kalau bukan angka
const parseDecimal = (value: unknown): number | null => {
    const text = String(value ?? '').trim().split(',').join('.');
    if (text === '' || text === '.') return null;

    let dotCount = 0;
    for (const char of text) {
        if (char === '.') {
            dotCount += 1;
            continue;
        }
        if (char < '0' || char > '9') return null;
    }
    if (dotCount > 1) return null;

    return Number(text);
};

// cek angka ukuran tubuh ada di dalam batas
const checkMeasure = (value: unknown, limit: MeasureLimit): { number: number | null; error: string | null } => {
    const num = parseDecimal(value);
    if (num === null || num < limit.min || num > limit.max) {
        return { number: null, error: `${limit.label} harus berupa angka antara ${limit.min} dan ${limit.max}!` };
    }
    return { number: num, error: null };
};

// baca tanggal berformat YYYY-MM-DD, null kalau formatnya salah atau tanggalnya tidak ada
const parseDateOnly = (value: unknown): Date | null => {
    const parts = String(value ?? '').trim().split('-');
    if (parts.length !== 3) return null;

    const yearText = parts[0] ?? '';
    const monthText = parts[1] ?? '';
    const dayText = parts[2] ?? '';
    if (yearText.length !== 4 || monthText.length !== 2 || dayText.length !== 2) return null;

    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900) return null;

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
};

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
    const { fullName, email, phone, password, agreeToTerms } = req.body;

    if (!fullName || !email || !phone || !password) {
        res.status(400).json({ success: false, message: 'Nama lengkap, email, no HP, dan kata sandi wajib diisi!' });
        return;
    }

    const errors: Record<string, string> = {};
    const cleanEmail = String(email).trim();
    const cleanPhone = String(phone).replace(/[\s-]/g, ''); // buang spasi dan tanda strip

    // Email
    if (!isValidEmail(cleanEmail)) {
        errors.email = 'Format email tidak valid!';
    }

    // No HP
    const phoneDigits = cleanPhone.replace('+', '');
    if (!/^\+?\d+$/.test(cleanPhone)) {
        errors.phone = 'Nomor HP hanya boleh berisi angka!';
    } else if (phoneDigits.length < MIN_PHONE_DIGITS) {
        errors.phone = `Nomor HP minimal ${MIN_PHONE_DIGITS} digit!`;
    } else if (phoneDigits.length > MAX_PHONE_DIGITS) {
        errors.phone = `Nomor HP maksimal ${MAX_PHONE_DIGITS} digit!`;
    }

    // Kata sandi
    if (!isValidPassword(password)) {
        errors.password = PASSWORD_MESSAGE;
    }

    // Syarat & ketentuan
    if (!agreeToTerms) {
        errors.agreeToTerms = 'Anda harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi!';
    }

    if (Object.keys(errors).length > 0) {
        res.status(400).json({
            success: false,
            message: Object.values(errors)[0],
            errors
        });
        return;
    }

    // simpan versi yang sudah dibersihkan
    req.body.email = cleanEmail;
    req.body.phone = cleanPhone;
    next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email dan kata sandi wajib diisi!' });
        return;
    }
    next();
};

export const validateOtp = (req: Request, res: Response, next: NextFunction): void => {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
        res.status(400).json({ success: false, message: 'Email dan kode OTP wajib diisi!' });
        return;
    }
    if (!isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Format email tidak valid!' });
        return;
    }

    const cleanOtp = String(otpCode).trim();
    if (!OTP_REGEX.test(cleanOtp)) {
        res.status(400).json({ success: false, message: 'Kode OTP harus 4 digit angka!' });
        return;
    }

    req.body.otpCode = cleanOtp;
    next();
};

export const validateResendOtp = (req: Request, res: Response, next: NextFunction): void => {
    const { email, purpose } = req.body;
    if (!email || !isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Format email tidak valid!' });
        return;
    }
    if (purpose !== undefined && !['register', 'reset_password'].includes(purpose)) {
        res.status(400).json({ success: false, message: 'Tujuan OTP harus register atau reset_password!' });
        return;
    }
    next();
};

export const validateForgotPassword = (req: Request, res: Response, next: NextFunction): void => {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ success: false, message: 'Email wajib diisi!' });
        return;
    }
    if (!isValidEmail(email)) {
        res.status(400).json({ success: false, message: 'Format email tidak valid!', errors: { email: 'Format email tidak valid!' } });
        return;
    }
    next();
};

export const validateResetPassword = (req: Request, res: Response, next: NextFunction): void => {
    const { email, otpCode, newPassword, confirmPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
        res.status(400).json({ success: false, message: 'Email, kode OTP, dan kata sandi baru wajib diisi!' });
        return;
    }

    const errors: Record<string, string> = {};
    const cleanOtp = String(otpCode).trim();

    if (!isValidEmail(email)) {
        errors.email = 'Format email tidak valid!';
    }
    if (!OTP_REGEX.test(cleanOtp)) {
        errors.otpCode = 'Kode OTP harus 4 digit angka!';
    }
    if (!isValidPassword(newPassword)) {
        errors.newPassword = PASSWORD_MESSAGE;
    }
    // konfirmasi kata sandi (opsional: dicek hanya kalau dikirim)
    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
        errors.confirmPassword = 'Konfirmasi kata sandi tidak sama!';
    }

    if (Object.keys(errors).length > 0) {
        res.status(400).json({
            success: false,
            message: Object.values(errors)[0],
            errors
        });
        return;
    }

    req.body.email = String(email).trim();
    req.body.otpCode = cleanOtp;
    next();
};

export const validateBaby = (req: Request, res: Response, next: NextFunction): void => {
    const {
        fullName, gender, birthPlace, birthDate,
        weightKg, heightCm, headCircumferenceCm, lilaCm, conditionNote
    } = req.body;

    // LiLA dan kondisi balita boleh kosong
    if (!fullName || !gender || !birthPlace || !birthDate || !weightKg || !heightCm || !headCircumferenceCm) {
        res.status(400).json({ success: false, message: 'Nama, jenis kelamin, tempat, tanggal lahir, BB, TB, dan lingkar kepala wajib diisi!' });
        return;
    }

    const errors: Record<string, string> = {};
    const cleanName = String(fullName).trim();
    const cleanBirthPlace = String(birthPlace).trim();

    // Nama
    if (cleanName === '') {
        errors.fullName = 'Nama lengkap wajib diisi!';
    } else if (cleanName.length > MAX_BABY_NAME_LENGTH) {
        errors.fullName = `Nama lengkap maksimal ${MAX_BABY_NAME_LENGTH} karakter!`;
    }

    // Jenis kelamin
    if (gender !== 'L' && gender !== 'P') {
        errors.gender = 'Jenis kelamin harus L atau P!';
    }

    // Tempat lahir
    if (cleanBirthPlace === '') {
        errors.birthPlace = 'Tempat lahir wajib diisi!';
    } else if (cleanBirthPlace.length > MAX_BIRTH_PLACE_LENGTH) {
        errors.birthPlace = `Tempat lahir maksimal ${MAX_BIRTH_PLACE_LENGTH} karakter!`;
    }

    // Tanggal lahir (format YYYY-MM-DD, tidak boleh di masa depan)
    const parsedBirthDate = parseDateOnly(birthDate);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (parsedBirthDate === null) {
        errors.birthDate = 'Format tanggal lahir harus YYYY-MM-DD, misalnya 2025-04-01!';
    } else if (parsedBirthDate.getTime() > endOfToday.getTime()) {
        errors.birthDate = 'Tanggal lahir tidak boleh di masa depan!';
    }

    // Berat, tinggi, lingkar kepala
    const weight = checkMeasure(weightKg, WEIGHT_LIMIT);
    if (weight.error) errors.weightKg = weight.error;

    const height = checkMeasure(heightCm, HEIGHT_LIMIT);
    if (height.error) errors.heightCm = height.error;

    const head = checkMeasure(headCircumferenceCm, HEAD_LIMIT);
    if (head.error) errors.headCircumferenceCm = head.error;

    // LiLA (opsional)
    let lila: number | null = null;
    const lilaProvided = lilaCm !== undefined && lilaCm !== null && String(lilaCm).trim() !== '';
    if (lilaProvided) {
        const lilaResult = checkMeasure(lilaCm, LILA_LIMIT);
        if (lilaResult.error) {
            errors.lilaCm = lilaResult.error;
        } else {
            lila = lilaResult.number;
        }
    }

    // Kondisi balita (opsional): normal / berisiko / stunting
    let cleanCondition: string | null = null;
    const conditionProvided = conditionNote !== undefined && conditionNote !== null && String(conditionNote).trim() !== '';
    if (conditionProvided) {
        cleanCondition = String(conditionNote).trim().toLowerCase();
        if (!BABY_CONDITIONS.includes(cleanCondition)) {
            errors.conditionNote = 'Kondisi balita harus normal, berisiko, atau stunting!';
        }
    }

    if (Object.keys(errors).length > 0) {
        res.status(400).json({
            success: false,
            message: Object.values(errors)[0],
            errors
        });
        return;
    }

    // simpan versi yang sudah dibersihkan
    req.body.fullName = cleanName;
    req.body.birthPlace = cleanBirthPlace;
    req.body.weightKg = weight.number;
    req.body.heightCm = height.number;
    req.body.headCircumferenceCm = head.number;
    req.body.lilaCm = lila;
    req.body.conditionNote = cleanCondition;
    next();
};

export const validateCheckup = (req: Request, res: Response, next: NextFunction): void => {
    const { babyId, babyAgeMonths, checkupDate, weightKg, heightCm, conditionStatus } = req.body;
    if (!babyId || !babyAgeMonths || !checkupDate || !weightKg || !heightCm || !conditionStatus) {
        res.status(400).json({ success: false, message: 'Data balita, usia, tanggal, BB, TB, dan kondisi wajib diisi!' });
        return;
    }
    if (!['normal', 'berisiko', 'stunting'].includes(conditionStatus)) {
        res.status(400).json({ success: false, message: 'Kondisi harus normal, berisiko, atau stunting!' });
        return;
    }
    next();
};

export const validateChangePassword = (req: Request, res: Response, next: NextFunction): void => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Kata sandi lama dan baru wajib diisi!' });
        return;
    }
    if (!isValidPassword(newPassword)) {
        res.status(400).json({ success: false, message: PASSWORD_MESSAGE, errors: { newPassword: PASSWORD_MESSAGE } });
        return;
    }
    if (confirmPassword !== undefined && confirmPassword !== newPassword) {
        res.status(400).json({ success: false, message: 'Konfirmasi kata sandi tidak sama!', errors: { confirmPassword: 'Konfirmasi kata sandi tidak sama!' } });
        return;
    }
    next();
};

export const validateRecipe = (req: Request, res: Response, next: NextFunction): void => {
    const { title, photoUrl, ageCategory, ingredients, steps, proteinG, carbsG, fatG, calories, status } = req.body;

    if (!title || !photoUrl || !ageCategory || !ingredients || !steps || !status) {
        res.status(400).json({ success: false, message: 'Foto, nama resep, usia, bahan, langkah, dan status wajib diisi!' });
        return;
    }

    // foto harus hasil unggahan lewat POST /api/uploads/recipe-photo (Vercel Blob, folder recipes/)
    const imageError = getBlobPhotoError(photoUrl, 'recipes');
    if (imageError) {
        res.status(400).json({ success: false, message: imageError });
        return;
    }
    if (!AGE_CATEGORIES.includes(String(ageCategory))) {
        res.status(400).json({ success: false, message: 'Usia harus 6, 7-8, 9-11, atau 12+ bulan!' });
        return;
    }
    if (!isValidNumber(proteinG) || !isValidNumber(carbsG) || !isValidNumber(fatG)) {
        res.status(400).json({ success: false, message: 'Protein, karbohidrat, dan lemak wajib diisi dengan angka!' });
        return;
    }
    if (!isValidNumber(calories)) {
        res.status(400).json({ success: false, message: 'Estimasi kalori wajib diisi dengan angka!' });
        return;
    }
    if (!['draft', 'terpublikasi'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status harus draft atau terpublikasi!' });
        return;
    }
    next();
};

export const validateComment = (req: Request, res: Response, next: NextFunction): void => {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
        res.status(400).json({ success: false, message: 'Komentar wajib diisi!' });
        return;
    }
    next();
};

export const validateReply = (req: Request, res: Response, next: NextFunction): void => {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim() === '') {
        res.status(400).json({ success: false, message: 'Balasan wajib diisi!' });
        return;
    }
    if (content.trim().length > 500) {
        res.status(400).json({ success: false, message: 'Balasan maksimal 500 karakter!' });
        return;
    }
    next();
};

export const validateAiRequest = (req: Request, res: Response, next: NextFunction): void => {
    const { babyId, availableIngredients } = req.body;
    if (!babyId || !availableIngredients) {
        res.status(400).json({ success: false, message: 'Data balita dan bahan di rumah wajib diisi!' });
        return;
    }
    next();
};