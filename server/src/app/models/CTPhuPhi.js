const db = require('../config/mysqldb');

class CTPhuPhi {
    constructor(data) {
        this.MaPP = data.MaPP;
        this.MaHDT = data.MaHDT;
        this.NgayApDung = data.NgayApDung;
    }
    static async LayTatCa() {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM phuphi ORDER BY TenPP DESC`
        );
        await pool.end();
        return (rows.length === 0)? [] : rows.map(r => new CTPhuPhi(r));
    }
    static async LayBangMaPP(id) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT * FROM chitietphuphi WHERE MaPP = ?",
            [id]
        );
        await pool.end();

        if (rows.length === 0) return null;

        return new CTPhuPhi(rows[0]);
    }
    static async LayBangMaHDT(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM chitietphuphi 
            WHERE MaHDT=?`,
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : rows.map(r => new CTPhuPhi(r));
    }
    static async Tao(data) {
        const pool = await db();

        const sql = `
            INSERT INTO chitietphuphi(MaPP, MaHDT, NgayApDung) VALUES (?,?,CURRENT_DATE)
        `;

        const params = [
            data.MaPP,
            data.MaHDT
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return ;
    }
    static async Xoa(id) {
        const pool = await db();

        const sql = `DELETE FROM chitietphuphi WHERE MaPP = ?`;

        await pool.query(sql, [id]);
        await pool.end();

        return this.LayTatCa();
    }
}

module.exports = CTPhuPhi;
