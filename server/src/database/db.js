// server/src/database/db.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const env = require('../app/config/env.config');

const dbTimezone = env.db.timezone || '+07:00';

const poolConfig = {
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: dbTimezone,
  dateStrings: ['DATE', 'TIME'],
};

// Cấu hình SSL kèm file chứng chỉ isrgrootx1.pem cho TiDB Cloud
if (env.db.enableSsl) {
  poolConfig.ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
    ca: fs.existsSync(env.db.caPath)
      ? fs.readFileSync(env.db.caPath)
      : undefined,
  };
}

const pool = mysql.createPool(poolConfig);

// Ép múi giờ UTC+7 trên từng phiên kết nối TiDB Cloud để CURDATE(), CURTIME(), NOW() luôn đúng giờ VN
pool.on('connection', (connection) => {
  connection.query(`SET time_zone = '${dbTimezone}'`, (err) => {
    if (err) {
      console.error('❌ Không thể thiết lập time_zone cho TiDB Cloud:', err.message);
    }
  });
});

// Kiểm tra kết nối và múi giờ ngay khi chạy Server
(async () => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT @@session.time_zone AS tz, NOW() AS nowTime`
    );
    console.log(
      `✅ Đã kết nối TiDB Cloud thành công! (Database: ${env.db.database} | TZ: ${rows[0].tz} | Giờ DB: ${rows[0].nowTime})`
    );
    connection.release();
  } catch (error) {
    console.error('❌ Lỗi kết nối TiDB Cloud:', error.message);
  }
})();

module.exports = pool;