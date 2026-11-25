// server/src/app/models/lichSuThe.model.js
const db = require("../../database/db");

const LichSuTheModel = {
  async create(maThe) {
    const [result] = await db.query(
      `INSERT INTO LichSuThe (MaThe, NgayQuetThe, GioQuetThe)
       VALUES (?, CURDATE(), CURTIME())`,
      [maThe]
    );
    return result.insertId;
  },

  async findByMaTheList(maTheList, { tuNgay, denNgay, limit = 200 } = {}) {
    if (!maTheList || maTheList.length === 0) return [];
    const conditions = [`MaThe IN (${maTheList.map(() => "?").join(",")})`];
    const params = [...maTheList];

    if (tuNgay) {
      conditions.push(`NgayQuetThe >= ?`);
      params.push(tuNgay);
    }
    if (denNgay) {
      conditions.push(`NgayQuetThe <= ?`);
      params.push(denNgay);
    }

    params.push(Number(limit));

    const [rows] = await db.query(
      `SELECT MaLS, MaThe, NgayQuetThe, GioQuetThe
       FROM LichSuThe
       WHERE ${conditions.join(" AND ")}
       ORDER BY NgayQuetThe DESC, GioQuetThe DESC
       LIMIT ?`,
      params
    );
    return rows;
  },

  async deleteByMaThe(maThe) {
    const [result] = await db.query(
      `DELETE FROM LichSuThe WHERE MaThe = ?`,
      [maThe]
    );
    return result.affectedRows;
  },
};

module.exports = LichSuTheModel;