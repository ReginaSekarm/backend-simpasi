import bcrypt from 'bcrypt';
import pool from './config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const seedKader = async () => {
    try {
        const email = 'kader1@simpasi.id';
        const plainPassword = 'kader123';

        // cek apakah sudah ada
        const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log('Akun kader dengan email ini sudah ada, dilewati.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const [result]: any = await pool.query(
            `INSERT INTO users (full_name, email, phone, password, role, is_verified, nik, gender, birth_date)
             VALUES (?, ?, ?, ?, 'kader', TRUE, ?, ?, ?)`,
            ['Regina Sekar', email, '081234567890', hashedPassword, '3573012345670001', 'P', '1998-05-20']
        );

        const userId = result.insertId;

        await pool.query(
            `INSERT INTO kader_profiles (user_id, posyandu_name, position, region, joined_at)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, 'Posyandu Melati', 'Kader Gizi', 'Kelurahan Sukun, Malang', '2024-01-15']
        );

        console.log('Akun kader berhasil dibuat!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${plainPassword}`);
        process.exit(0);
    } catch (error) {
        console.error('Gagal membuat akun kader:', error);
        process.exit(1);
    }
};

seedKader();