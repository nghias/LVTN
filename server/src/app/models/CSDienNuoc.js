const db = require('../config/mysqldb');

class CSDienNuoc {
    constructor(data) {
        this.MaCS = data.MaCS;
        this.MaPhong = data.MaPhong;
        this.SoDCu = data.SoDCu;
        this.SoDMoi = data.SoDMoi;
        this.SoNCu = data.SoNCu;
        this.SoNMoi = data.SoNMoi;
        this.NgayGhi = data.NgayGhi;
    }
    static async KiemTraCoChiSo() {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT COUNT(*) AS SO FROM chisodiennuoc 
            WHERE MONTH(NgayGhi) = MONTH(CURDATE()) 
            AND YEAR(NgayGhi) = YEAR(CURDATE());`,
        );
        await pool.end();
        return (rows.length === 0)? 0 : rows[0].SO;
    }
    static async LayTatCa() {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM chisodiennuoc ORDER BY NgayGhi DESC`
        );
        await pool.end();
        return (rows.length === 0)? [] : rows.map(r => new CSDienNuoc(r));
    }
    static async LayBangMaCS(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM chisodiennuoc WHERE MaCS = ? LIMIT 1`,
            [id]
        );
        await pool.end();
        return (rows.length === 0)? [] : new CSDienNuoc(rows[0]);
    }
    static async LayBangMaPhong(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM chisodiennuoc WHERE MaPhong = ?`,
            [id]
        );
        await pool.end();
        return (rows.length === 0)? [] : rows.map(r => new CSDienNuoc(r));
    }
    static async LayMoiBangMaPhong(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM chisodiennuoc WHERE MaPhong = ? ORDER BY NgayGhi DESC LIMIT 1`,
            [id]
        );
        await pool.end();
        return (rows.length === 0)? [] : new CSDienNuoc(rows[0]);
    }
    static async TimKiem(keyword) {
        const pool = await db();

        const searchTerm = `%${keyword}%`;
        let sql = `
            SELECT c.* FROM chisodiennuoc c
            JOIN Phong p ON c.MaPhong = p.MaPhong
            WHERE p.Ten LIKE ?
            ORDER BY c.NgayGhi DESC
        `;

        const [rows] = await pool.query(sql, [searchTerm]);
        await pool.end();

        return (rows.length === 0)? [] : rows.map(r => new CSDienNuoc(r));
    }
    static async Them(data) {
        const pool = await db();

        const sql = `
            INSERT INTO chisodiennuoc(MaPhong, SoDCu, SoDMoi, SoNCu, SoNMoi, NgayGhi)
            VALUES (?,?,?,?,?,CURRENT_DATE)
        `;

        const params = [
            data.MaPhong,
            data.SoDCu,
            data.SoDMoi,
            data.SoNCu,
            data.SoNMoi
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return CSDienNuoc.LayBangMaCS(result.insertId);
    }
    static async Sua(id, data) {
        const pool = await db();

        const sql = `
            UPDATE chisodiennuoc 
            SET SoDMoi=?, SoNMoi=?
            WHERE MaCS=?
        `;

        const params = [
            data.SoDMoi,
            data.SoNMoi,
            id
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return CSDienNuoc.LayBangMaCS(result.insertId);
    }

    static async Xoa(id) {
        const pool = await db();

        const sql = `DELETE FROM chisodiennuoc WHERE MaCS=?`;

        await pool.query(sql, [id]);
        await pool.end();

        return this.LayTatCa();
    }
    
    static async XoaBangNgayGhi(id) {
        const pool = await db();

        const sql = `DELETE FROM chisodiennuoc WHERE Ngayghi=?`;

        await pool.query(sql, [id]);
        await pool.end();

        return this.LayTatCa();
    }
}

module.exports = CSDienNuoc;
