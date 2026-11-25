import dns from 'node:dns';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

type OtpPurpose = 'register' | 'reset_password';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // false untuk port 587 (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
});

export const sendOtpEmail = async (
    toEmail: string,
    otpCode: string,
    purpose: OtpPurpose,
    expireMinutes: number
): Promise<void> => {
    const isReset = purpose === 'reset_password';
    const subject = isReset
        ? 'Kode OTP Reset Kata Sandi - SiMPASI'
        : 'Kode OTP Verifikasi Akun - SiMPASI';

    const title = isReset ? 'Reset Kata Sandi' : 'Verifikasi Akun';
    const description = isReset
        ? 'Kami menerima permintaan untuk mereset kata sandi akun SiMPASI Anda. Gunakan kode OTP di bawah ini untuk melanjutkan:'
        : 'Terima kasih telah mendaftar di SiMPASI. Gunakan kode OTP di bawah ini untuk memverifikasi akun Anda:';

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="color: #D45060; margin-top: 0;">SiMPASI - ${title}</h2>
            <p style="color: #374151; font-size: 14px; line-height: 1.5;">${description}</p>
            <div style="margin: 24px 0; text-align: center;">
                <span style="display: inline-block; padding: 12px 28px; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #111827; background-color: #FCEBD5; border-radius: 8px;">
                    ${otpCode}
                </span>
            </div>
            <p style="color: #6b7280; font-size: 13px;">Kode ini berlaku selama <strong>${expireMinutes} menit</strong>. Jangan bagikan kode ini kepada siapa pun.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"SiMPASI" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject,
        html,
    });
};