const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS, 
    database: process.env.DB_NAME,
    port: process.env.DB_PORT, 
    
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // ssl: {
    //     minVersion: 'TLSv1.2',
    //     rejectUnauthorized: true
    // }
};

async function KetNoi() {
    try {
        const pool = await mysql.createPool(config);
        return pool;
    } catch (err) {
        console.error('❌ Lỗi kết nối MySQL/TiDB:', err);
        throw err; 
    }
}

module.exports = KetNoi;
