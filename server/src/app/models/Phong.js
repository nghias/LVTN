const db = require('../config/mysqldb'); // file connectDB bạn đã tạo

class Phong {
    constructor(data) {
        this.MaPhong = data.MaPhong;
        this.Ten = data.Ten;
        this.DienTich = data.DienTich;
        this.Gia = data.Gia;
        this.HinhAnh = data.HinhAnh;
    }
    static async ThongKe() {
        const pool = await db();

        const [rows] = await pool.query(`
            SELECT 
            (SELECT COUNT(*) FROM phong) AS TongSoPhong,
            (SELECT COUNT(DISTINCT MaPhong) 
                FROM hopdongthue
                WHERE NgayKT >= CURDATE()) AS SoPhongDaThue,
            (
                (SELECT COUNT(*) FROM phong) - 
                (SELECT COUNT(DISTINCT MaPhong) FROM hopdongthue WHERE NgayKT >= CURDATE())
            ) AS SoPhongTrong
        `);
        
        await pool.end();
        
        // Trả về object kết quả đầu tiên (vì COUNT luôn trả về 1 dòng)
        return rows[0]; 
    }

    static async KiemTra(TenBien, GiaTri, MaPhong = null) {
        const pool = await db();
        const giaTri = `^${GiaTri}$`;
        
        let sql = `SELECT MaPhong FROM Phong WHERE ${TenBien} REGEXP ?`;
        const params = [giaTri];

        if (MaPhong) {
            sql += ` AND MaPhong != ?`;
            params.push(MaPhong);
        }

        sql += ` LIMIT 1`;

        const [rows] = await pool.query(sql, params);
        await pool.end();

        if (rows.length > 0) {
            return rows[0].MaPhong; 
        }
        
        return null; // Không tìm thấy thì trả về null
    }

    static async LayBangTen(name) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT * FROM Phong WHERE Ten = ? LIMIT 1",
            [name]
        );
        await pool.end();

        return (rows.length === 0)? [] : new Phong(rows[0]);
    }

    static async LayBangMaPhong(id) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT * FROM Phong WHERE MaPhong = ? LIMIT 1",
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : new Phong(rows[0]);
    }
    static async LayBangMaHDT(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT p.* FROM phong p
            JOIN hopdongthue hdt ON p.MaPhong=hdt.MaPhong
            WHERE hdt.MaHDT = ? LIMIT 1`,
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : new Phong(rows[0]);
    }
    static async LayBangMaND(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT p.* FROM phong p 
            JOIN hopdongthue hdt ON p.MaPhong=hdt.MaPhong AND hdt.NgayKT > CURRENT_DATE
            JOIN chitiethopdongthue ct ON hdt.MaHDT=ct.MaHDT
            WHERE ct.MaND= ? LIMIT 1`,
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : new Phong(rows[0]);
    }
    static async LayDSPhongBangMaPP(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT * FROM phong p
            JOIN hopdongthue hdt ON p.MaPhong=hdt.MaPhong AND hdt.NgayKT > CURRENT_DATE
            JOIN chitietphuphi ctpp ON hdt.MaHDT=ctpp.MaHDT
            WHERE ctpp.MaPP = ?`,
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : rows.map(row => new Phong(row));
    }
    static async LayDSPhongBangMaPPVaDangThue(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT p.* FROM phong p
            JOIN hopdongthue hdt ON p.MaPhong=hdt.MaPhong AND hdt.NgayKT > CURRENT_DATE
            WHERE p.MaPhong not in 
                (SELECT p.MaPhong FROM phong p
                JOIN hopdongthue hdt ON p.MaPhong=hdt.MaPhong AND hdt.NgayKT > CURRENT_DATE
                JOIN chitietphuphi ctpp ON hdt.MaHDT=ctpp.MaHDT
                WHERE ctpp.MaPP = ?)`,
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : rows.map(row => new Phong(row));
    }
    static async LayBangMaHD(id) {
        const pool = await db();

        const [rows] = await pool.query(
            `SELECT p.* FROM phong p
            JOIN hopdongthue hdt ON p.MaPhong=hdt.MaPhong
            JOIN hoadon hd ON hdt.MaHDT=hd.MaHDT
            WHERE hd.MaHD = ? LIMIT 1`,
            [id]
        );
        await pool.end();

        return (rows.length === 0)? [] : new Phong(rows[0]);
    }

    static async TimKiem(search) {
        const pool = await db();

        const s = search.toLowerCase().trim();

        let rows=[];

        // Danh sách từ khóa
        // Bỏ dấu tiếng Việt
        function removeAccents(str) {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        }

        // Từ khóa gốc
        const hiringKeywords = [
            "đang cho thuê",
            "cho thuê",
            "đang thuê",
            "thuê"
        ].map(removeAccents);
        const emptyKeywords = [
            "đang cho thuê",
            "cho thuê",
            "đang thuê",
            "thuê"
        ].map(removeAccents);

        // Hàm kiểm tra
        const cleanText = removeAccents(s.toLowerCase());

        // Nếu search chứa từ khóa thì tìm phòng
        const isHiringSearch = hiringKeywords.some(key => cleanText.includes(key));
        const isEmptySearch = emptyKeywords.some(key => cleanText.includes(key));

        if (isHiringSearch) {
            [rows] = await pool.query(`
                SELECT p.*
                FROM Phong p
                JOIN HopDongThue h ON p.MaPhong = h.MaPhong
                WHERE h.NgayKT > CURRENT_DATE
                ORDER BY Ten ASC
            `);
        }else if (isEmptySearch) {
            [rows] = await pool.query(`
                SELECT p.*
                FROM Phong p
                LEFT JOIN HopDongThue h ON p.MaPhong = h.MaPhong 
                    AND h.NgayKT > CURRENT_DATE
                WHERE h.MaPhong IS NULL
                ORDER BY Ten ASC
            `);
        }else{
            const like = `%${search}%`;
            [rows] = await pool.query(
                `SELECT * FROM Phong WHERE Ten LIKE ? ORDER BY Ten ASC`,
                [like]
            );
        }

        await pool.end();

        return (rows.length === 0)? [] : rows.map(row => new Phong(row));
    }

    static async LayTatCa() {
        const pool = await db();

        const [rows] = await pool.query("SELECT * FROM Phong ORDER BY Ten ASC");
        await pool.end();

        return (rows.length === 0)? [] : rows.map(row => new Phong(row));
    }
    static async LayPhongDaThue(){
        const pool =  await db();
        const [rows] = await pool.query("SELECT * FROM `phong` WHERE MaPhong in (SELECT MaPhong FROM `hopdongthue` WHERE NgayKT > CURRENT_DATE)")
        await pool.end();
        
        return (rows.length === 0)? [] : rows.map(row => new Phong(row));
    }
    static async LayDSPhongDaThueChuaCS(){
        const pool =  await db();
        const [rows] = await pool.query(`
            SELECT * FROM phong p
            WHERE 
                p.MaPhong IN (
                    SELECT MaPhong 
                    FROM hopdongthue 
                    WHERE NgayKT >= CURDATE()
                )
                
                AND NOT EXISTS (
                    SELECT 1 
                    FROM chisodiennuoc cs 
                    WHERE cs.MaPhong = p.MaPhong 
                    AND MONTH(cs.NgayGhi) = MONTH(CURDATE()) 
                    AND YEAR(cs.NgayGhi) = YEAR(CURDATE())
                );
            `)
        await pool.end();
        
        return (rows.length === 0)? [] : rows.map(row => new Phong(row));
    }
    static async LayDSPhongTrong(){
        const pool =  await db();
        const [rows] = await pool.query("SELECT * FROM `phong` WHERE MaPhong not in (SELECT MaPhong FROM `hopdongthue` WHERE NgayKT > CURRENT_DATE) ORDER BY MaPhong")
        await pool.end();
        
        return (rows.length === 0)? [] : rows.map(row => new Phong(row));
    }
    
    static async Them(data) {
        const pool = await db();

        const sql = `
            INSERT INTO Phong (Ten, DienTich, Gia, HinhAnh) VALUES (?, ?, ?, ?)
        `;
        const params = [
            data.TenPhong,
            data.DienTich,
            data.Gia,
            data.Hinh
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return this.LayBangMaPhong(result.insertId);
    }

    static async Sua(id, Ten, DienTich, Gia, HinhAnh) {
        const pool = await db();

        const sql = `
            UPDATE Phong
            SET Ten = ?, Gia = ?, DienTich = ?, HinhAnh = ?
            WHERE MaPhong = ?
        `;

        const params = [Ten, Gia, DienTich, HinhAnh, id];

        await pool.query(sql, params);
        await pool.end();

        return this.LayBangMaPhong(id);
    }

    static async Xoa(id) {
        const pool = await db();

        const sql = `DELETE FROM Phong WHERE MaPhong = ?`;

        await pool.query(sql, [id]);
        await pool.end();

        return this.LayDSPhong();
    }
}

module.exports = Phong;
