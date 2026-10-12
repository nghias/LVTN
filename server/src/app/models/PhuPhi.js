const db = require('../config/mysqldb');

class PhuPhi {
    constructor(data) {
        this.MaPP = data.MaPP;
        this.TenPP = data.TenPP;
        this.Gia = data.Gia;
        this.GhiChu = data.GhiChu;
    }
    static async LayTatCa() {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM phuphi ORDER BY TenPP DESC`
        );
        await pool.end();
        return (rows.length === 0)? [] : rows.map(r => new PhuPhi(r));
    }
    static async LayBangMaPP(id) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT * FROM phuphi WHERE MaPP = ? LIMIT 1",
            [id]
        );
        await pool.end();

        if (rows.length === 0) return null;

        return new PhuPhi(rows[0]);
    }
    static async LayBangMaHDT(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM phuphi pp
            JOIN chitietphuphi ctpp ON pp.MaPP=ctpp.MaPP
            WHERE ctpp.MaHDT=?`,
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : rows.map(r => new PhuPhi(r));
    }
    static async TimKiem(keyword) {
        const pool = await db();

        const searchTerm = `%${keyword}%`;

        // SỬA CÂU SQL: Lấy Hợp Đồng làm gốc (FROM hopdongthue)
        const sql = `
            SELECT * FROM PhuPhi 
            WHERE TenPP LIKE ? 
            OR GhiChu LIKE ?
        `;

        const [rows] = await pool.query(sql, [searchTerm, searchTerm]);
        
        await pool.end(); 

        return (rows.length === 0)? [] : rows.map(r => new PhuPhi(r));
    }
    static async Tao(data) {
        const pool = await db();

        const sql = `
            INSERT INTO phuphi(TenPP, Gia, GhiChu) VALUES (?,?,?)
        `;

        const params = [
            data.TenPP,
            data.Gia,
            data.GhiChu
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return {
            MaPP: result.insertId,
            ...data                
        };
    }
    static async Sua(id, data) {
        const pool = await db();

        const sql = `
            UPDATE phuphi SET 
            TenPP=?,Gia=?,GhiChu=?
            WHERE MaPP=?
        `;

        const params = [
            data.TenPP,
            data.Gia,
            data.GhiChu,
            id
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return {
            MaPP: result.insertId,
            ...data                
        };
    }
    static async Xoa(id) {
        const pool = await db();

        const sql = `DELETE FROM phuphi WHERE MaPP = ?`;

        await pool.query(sql, [id]);
        await pool.end();

        return PhuPhi.LayTatCa();
    }
}

module.exports = PhuPhi;
