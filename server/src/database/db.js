const mysql = require('mysql2/promise');
const fs = require('fs');
const env = require('../app/config/env.config');

const poolConfig = {
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
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

// Kiểm tra kết nối ngay khi chạy Server
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Đã kết nối TiDB Cloud thành công! (Database: ${env.db.database})`);
    connection.release();
  } catch (error) {
    console.error('❌ Lỗi kết nối TiDB Cloud:', error.message);
  }
})();

module.exports = pool;