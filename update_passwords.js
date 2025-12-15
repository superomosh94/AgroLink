const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updatePasswords() {
    try {
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        console.log(`Generated hash for '${password}': ${hash}`);
        const fs = require('fs');
        fs.writeFileSync('hash.txt', hash);

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'agrolink'
        });

        console.log('Updating user passwords in database...');
        const [result] = await connection.execute(
            'UPDATE users SET password_hash = ?',
            [hash]
        );

        console.log(`✓ Updated ${result.changedRows} users with new password hash.`);

        await connection.end();
        console.log('Done.');
    } catch (error) {
        console.error('Error:', error);
    }
}

updatePasswords();
