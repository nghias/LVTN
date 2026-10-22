const db = require('../../database/db');

const TienIchModel = {
  getAll: async () => {
    const sql = `SELECT MaTI, TenTI, MoTa FROM TienIch ORDER BY MaTI ASC`;
    const [rows] = await db.execute(sql);
    return rows;
  },
};

module.exports = TienIchModel;