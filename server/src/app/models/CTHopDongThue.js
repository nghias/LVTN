const db = require('../config/mysqldb');

class CTHopDongThue {
    constructor(data) {
        this.MaHDT = data.MaHDT;
        this.MaND = data.MaND;
        this.NgayKy = data.NgayKy;
    }
    static async LayTatCa() {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM chitiethopdongthue ORDER BY MaHDT DESC`
        );
        await pool.end();
        return (rows.length === 0)? [] : rows.map(r => new CTHopDongThue(r));
    }
    static async LayBangMaHDT(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM chitiethopdongthue WHERE MaHDT = ? LIMIT 1`,
            [id]
        );
        await pool.end();
        return (rows.length === 0)? [] : new CTHopDongThue(rows[0]);
    }
    static async Tao(data) {
        const pool = await db();

        const sql = `
            INSERT INTO chitiethopdongthue(MaND, MaHDT, NgayKy) VALUES (?,?,CURRENT_DATE)
        `;

        const params = [
            data.MaND,
            data.MaHDT
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return this.LayTatCa();
    }
    static async Xoa(id) {
        const pool = await db();

        const sql = `DELETE FROM chitiethopdongthue WHERE MaHDT = ?`;

        await pool.query(sql, [id]);
        await pool.end();

        return this.LayTatCa();
    }
}

module.exports = CTHopDongThue;
