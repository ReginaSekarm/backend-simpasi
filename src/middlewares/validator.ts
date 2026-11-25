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
const MAX_ALLERGIES_LENGTH = 255;
const BABY_CONDITIONS = ['normal', 'berisiko', 'stunting'];

// batas angka yang masuk akal untuk balita (ubah kalau perlu)
type MeasureLimit = { min: number; max: number; label: string };
const WEIGHT_LIMIT: MeasureLimit = { min: 1, max: 30, label: 'Berat badan (kg)' };
const HEIGHT_LIMIT: MeasureLimit = { min: 30, max: 130, label: 'Tinggi badan (cm)' };
const HEAD_LIMIT: MeasureLimit = { min: 20, max: 60, label: 'Lingkar kepala (cm)' };
const LILA_LIMIT: MeasureLimit = { min: 5, max: 30, label: 'LiLA (cm)' };

// ---------- Aturan kader ----------
const MAX_KADER_NAME_LENGTH = 100;
const KADER_NIK_LENGTH = 16;

const isValidEmail = (value: unknown): boolean =>
    typeof value === 'string' && EMAIL_REGEX.test(value.trim());

const isValidPassword = (value: unknown): boolean =>
    typeof value === 'string' && PASSWORD_REGEX.test(value);

// true kalau nilainya ada isinya (bukan undefined, null, atau teks kosong)
const isFilled = (value: unknown): boolean =>
    value !== undefined && value !== null && String(value).trim() !== '';

// ubah "6,4" atau "6.4" jadi angka 6.4, null kalau bukan angka valid atau minus
const parseDecimal = (value: unknown): number | null => {
    if (typeof value === 'boolean' || typeof value === 'object') return null;
    if (typeof value === 'number') {
        return Number.isFinite(value) && value >= 0 ? value : null;
    }

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

    const num = Number(text);
    return Number.isFinite(num) && num >= 0 ? num : null;
};

// cek angka tidak kosong, bukan huruf, dan tidak minus
const isValidNumber = (value: unknown): boolean => {
    if (!isFilled(value)) return false;
    return parseDecimal(value) !== null;
};

// semua nilai harus angka valid; kalau required = false, nilai yang kosong boleh dilewati
const areNumbersValid = (values: unknown[], required: boolean): boolean =>
    values.every((value) => (isFilled(value) ? isValidNumber(value) : !required));

// "6 Bulan", "7 - 8 Bulan", "9-11", "12 Bulan +" -> "6" | "7-8" | "9-11" | "12+" (null kalau tidak dikenali)
const normalizeAgeCategory = (value: unknown): string | null => {
    const first = parseInt(String(value ?? '').trim(), 10);
    if (first === 6) return '6';
    if (first === 7) return '7-8';
    if (first === 9) return '9-11';
    if (first === 12) return '12+';
    return null;
};

// normalisasi gender ke 'L' atau 'P' (null kalau tidak dikenali)
const normalizeBabyGender = (value: unknown): 'L' | 'P' | null => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (raw === 'l' || raw === 'laki-laki' || raw === 'laki laki' || raw === 'male') return 'L';
    if (raw === 'p' || raw === 'perempuan' || raw === 'female') return 'P';
    return null;
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
        weightKg, heightCm, headCircumferenceCm, lilaCm, conditionNote, allergies
    } = req.body;

    // LiLA, kondisi balita, dan alergi boleh kosong
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
    const normalizedGender = normalizeBabyGender(gender);
    if (!normalizedGender) {
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

    // Alergi (opsional)
    let cleanAllergies: string | null = null;
    if (allergies !== undefined && allergies !== null) {
        const rawAllergies = Array.isArray(allergies)
            ? allergies.map((item) => String(item).trim()).filter(Boolean).join(', ')
            : String(allergies).trim();
        if (rawAllergies.length > MAX_ALLERGIES_LENGTH) {
            errors.allergies = `Alergi maksimal ${MAX_ALLERGIES_LENGTH} karakter!`;
        } else if (rawAllergies !== '') {
            cleanAllergies = rawAllergies;
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
    if (normalizedGender) req.body.gender = normalizedGender;
    req.body.birthPlace = cleanBirthPlace;
    req.body.weightKg = weight.number;
    req.body.heightCm = height.number;
    req.body.headCircumferenceCm = head.number;
    req.body.lilaCm = lila;
    req.body.conditionNote = cleanCondition;
    req.body.allergies = cleanAllergies;
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

// Resep: draft boleh belum lengkap (hanya nama yang wajib), resep terpublikasi harus lengkap.
// Kolom yang diisi tetap diperiksa, baik untuk draft maupun terpublikasi.
export const validateRecipe = (req: Request, res: Response, next: NextFunction): void => {
    const { title, photoUrl, ageCategory, ingredients, steps, proteinG, carbsG, fatG, calories, status } = req.body;

    if (!['draft', 'terpublikasi'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status harus draft atau terpublikasi!' });
        return;
    }
    const isDraft = status === 'draft';

    // nama wajib untuk draft maupun terpublikasi
    if (!isFilled(title)) {
        res.status(400).json({ success: false, message: 'Nama resep wajib diisi!' });
        return;
    }

    // resep yang dipublikasikan harus lengkap
    if (!isDraft && (!isFilled(photoUrl) || !isFilled(ageCategory) || !isFilled(ingredients) || !isFilled(steps))) {
        res.status(400).json({ success: false, message: 'Foto, usia, bahan, dan langkah wajib diisi untuk mempublikasikan resep!' });
        return;
    }

    // foto (kalau diisi) harus hasil unggahan lewat POST /api/uploads/recipe-photo (Vercel Blob, folder recipes/).
    // URL pratinjau browser (blob:) ditolak karena tidak bisa dibuka lagi setelah halaman ditutup.
    if (isFilled(photoUrl)) {
        const imageError = getBlobPhotoError(photoUrl, 'recipes');
        if (imageError) {
            res.status(400).json({ success: false, message: imageError });
            return;
        }
    }

    // usia (kalau diisi): terima "6 Bulan", "7 - 8 Bulan", dst., lalu simpan sebagai "6", "7-8", "9-11", "12+"
    if (isFilled(ageCategory)) {
        const normalizedAge = normalizeAgeCategory(ageCategory);
        if (normalizedAge === null) {
            res.status(400).json({ success: false, message: 'Usia harus 6, 7-8, 9-11, atau 12+ bulan!' });
            return;
        }
        req.body.ageCategory = normalizedAge;
    }

    if (!areNumbersValid([proteinG, carbsG, fatG], !isDraft)) {
        res.status(400).json({ success: false, message: 'Protein, karbohidrat, dan lemak wajib diisi dengan angka!' });
        return;
    }
    if (!areNumbersValid([calories], !isDraft)) {
        res.status(400).json({ success: false, message: 'Estimasi kalori wajib diisi dengan angka!' });
        return;
    }

    req.body.proteinG = isFilled(proteinG) ? parseDecimal(proteinG) : 0;
    req.body.carbsG = isFilled(carbsG) ? parseDecimal(carbsG) : 0;
    req.body.fatG = isFilled(fatG) ? parseDecimal(fatG) : 0;
    req.body.calories = isFilled(calories) ? parseDecimal(calories) : 0;
    req.body.title = String(title).trim();
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

// Profil kader: semua field boleh tidak dikirim (artinya tidak diubah),
// tapi kalau dikirim tidak boleh kosong dan harus valid.
export const validateKaderProfile = (req: Request, res: Response, next: NextFunction): void => {
    const { fullName, email, nik, gender, birthDate, phone, photoUrl } = req.body;
    const errors: Record<string, string> = {};

    // Nama
    let cleanName: string | undefined;
    if (fullName !== undefined) {
        cleanName = String(fullName).trim();
        if (cleanName === '') {
            errors.fullName = 'Nama lengkap tidak boleh kosong!';
        } else if (cleanName.length > MAX_KADER_NAME_LENGTH) {
            errors.fullName = `Nama lengkap maksimal ${MAX_KADER_NAME_LENGTH} karakter!`;
        }
    }

    // Email
    let cleanEmail: string | undefined;
    if (email !== undefined) {
        cleanEmail = String(email).trim();
        if (!isValidEmail(cleanEmail)) {
            errors.email = 'Format email tidak valid!';
        }
    }

    // NIK: 16 digit angka
    let cleanNik: string | undefined;
    if (nik !== undefined) {
        cleanNik = String(nik).trim();
        if (!/^\d{16}$/.test(cleanNik)) {
            errors.nik = `NIK harus berupa ${KADER_NIK_LENGTH} digit angka!`;
        }
    }

    // Jenis kelamin: L atau P
    if (gender !== undefined && gender !== 'L' && gender !== 'P') {
        errors.gender = 'Jenis kelamin harus bernilai L atau P!';
    }

    // Tanggal lahir: YYYY-MM-DD dan tidak boleh di masa depan
    if (birthDate !== undefined) {
        const parsedBirthDate = parseDateOnly(birthDate);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        if (parsedBirthDate === null) {
            errors.birthDate = 'Format tanggal lahir harus YYYY-MM-DD, misalnya 1989-03-12!';
        } else if (parsedBirthDate.getTime() > endOfToday.getTime()) {
            errors.birthDate = 'Tanggal lahir tidak boleh di masa depan!';
        }
    }

    // Nomor HP / WhatsApp: angka saja, 10-15 digit (spasi dan strip dibuang)
    let cleanPhone: string | undefined;
    if (phone !== undefined) {
        cleanPhone = String(phone).replace(/[\s-]/g, '');
        const phoneDigits = cleanPhone.replace('+', '');
        if (!/^\+?\d+$/.test(cleanPhone)) {
            errors.phone = 'Nomor HP hanya boleh berisi angka!';
        } else if (phoneDigits.length < MIN_PHONE_DIGITS || phoneDigits.length > MAX_PHONE_DIGITS) {
            errors.phone = `Nomor HP harus terdiri dari ${MIN_PHONE_DIGITS} hingga ${MAX_PHONE_DIGITS} digit!`;
        }
    }

    // Foto profil: kosong atau null berarti hapus foto (ditangani controller),
    // kalau diisi harus hasil unggahan lewat POST /api/uploads/profile-photo
    if (isFilled(photoUrl)) {
        const imageError = getBlobPhotoError(String(photoUrl), 'profiles');
        if (imageError) {
            errors.photoUrl = imageError;
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
    if (cleanName !== undefined) req.body.fullName = cleanName;
    if (cleanEmail !== undefined) req.body.email = cleanEmail;
    if (cleanNik !== undefined) req.body.nik = cleanNik;
    if (cleanPhone !== undefined) req.body.phone = cleanPhone;
    next();
};

// ---------- Profil user (orang tua) ----------
const MAX_USER_NAME_LENGTH = 100;

// Semua field boleh tidak dikirim (artinya tidak diubah), tapi kalau dikirim harus valid.
// Kata sandi tidak diubah lewat sini (pakai validateChangePassword).
export const validateUserProfile = (req: Request, res: Response, next: NextFunction): void => {
    const { fullName, email, phone } = req.body;
    const errors: Record<string, string> = {};

    if (!isFilled(fullName) && !isFilled(email) && !isFilled(phone) &&
        fullName === undefined && email === undefined && phone === undefined) {
        res.status(400).json({ success: false, message: 'Tidak ada data yang diubah!' });
        return;
    }

    // Nama lengkap
    let cleanName: string | undefined;
    if (fullName !== undefined) {
        cleanName = String(fullName).trim();
        if (cleanName === '') {
            errors.fullName = 'Nama lengkap tidak boleh kosong!';
        } else if (cleanName.length > MAX_USER_NAME_LENGTH) {
            errors.fullName = `Nama lengkap maksimal ${MAX_USER_NAME_LENGTH} karakter!`;
        }
    }

    // Email
    let cleanEmail: string | undefined;
    if (email !== undefined) {
        cleanEmail = String(email).trim();
        if (!isValidEmail(cleanEmail)) {
            errors.email = 'Format email tidak valid!';
        }
    }

    // No HP: angka saja (boleh diawali +), 10-15 digit; spasi dan strip dibuang
    let cleanPhone: string | undefined;
    if (phone !== undefined) {
        cleanPhone = String(phone).replace(/[\s-]/g, '');
        const phoneDigits = cleanPhone.replace('+', '');
        if (!/^\+?\d+$/.test(cleanPhone)) {
            errors.phone = 'Nomor HP hanya boleh berisi angka!';
        } else if (phoneDigits.length < MIN_PHONE_DIGITS || phoneDigits.length > MAX_PHONE_DIGITS) {
            errors.phone = `Nomor HP harus terdiri dari ${MIN_PHONE_DIGITS} hingga ${MAX_PHONE_DIGITS} digit!`;
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
    if (cleanName !== undefined) req.body.fullName = cleanName;
    if (cleanEmail !== undefined) req.body.email = cleanEmail;
    if (cleanPhone !== undefined) req.body.phone = cleanPhone;
    next();
};