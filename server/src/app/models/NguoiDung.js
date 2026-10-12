const MaHoa = require('../config/MaHoa');
const db = require('../config/mysqldb');

class NguoiDung {
    constructor(data) {
        this.MaND = data.MaND;
        this.HoTen = data.HoTen;
        this.CCCD = data.CCCD;
        this.NamSinh = data.NamSinh;
        this.SDT = data.SDT;
        this.ThuongTru = data.ThuongTru;
        this.TenTK = data.TenTK;
        this.MatKhau = data.MatKhau;
        this.Quyen = data.Quyen;
        this.AVT = data.AVT;
        this.TenPhong = data.Ten || '';
        // this.TenPhong = data.Ten ? data.Ten : (data.Quyen === 'admin' ? "Chủ trọ" : "Hết hợp đồng");
    }
    static async ThongKe() {
        const pool = await db();

        const [rows] = await pool.query(`
            SELECT 
            (SELECT COUNT(*) FROM nguoidung WHERE Quyen = 'user') AS TongKhachHang,
            (SELECT COUNT(*) FROM nguoidung WHERE Quyen = 'admin') AS TongAdmin,
            (SELECT COUNT(DISTINCT ct.MaND) 
                FROM chitiethopdongthue ct 
                JOIN hopdongthue hd ON ct.MaHDT = hd.MaHDT 
                WHERE hd.NgayKT >= CURDATE()) AS KhachDangThue,
            (SELECT COUNT(DISTINCT MaND) FROM chitiethopdongthue) AS KhachCoLichSu
        `);
        
        await pool.end();
        
        const data = rows[0];

        const khachHetHan = data.KhachCoLichSu - data.KhachDangThue;
        const khachChuaThue = data.TongKhachHang - data.KhachCoLichSu;

        return {
            tongNguoiDung: data.TongKhachHang + data.TongAdmin,
            tongKhachHang: data.TongKhachHang,                  
            admin: data.TongAdmin,
            dangThue: data.KhachDangThue,
            hetHanHopDong: khachHetHan,
            chuaCoHopDong: khachChuaThue
        };
    }

    static async LayBangTenTKVaMaND(username, MaND) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT * FROM NguoiDung WHERE TenTK = ? AND MaND = ? LIMIT 1",
            [username, MaND]
        );
        await pool.end();

        if (rows.length === 0) return null;

        return new NguoiDung(rows[0]);
    }

    static async KiemTraMatKhau(username) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT MaND, MatKhau FROM NguoiDung WHERE TenTK = ? LIMIT 1",
            [username]
        );
        await pool.end();

        if (rows.length === 0) return null;

        return new NguoiDung(rows[0]); 
    }

    static async LayBangMaND(id) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT * FROM NguoiDung WHERE MaND = ? LIMIT 1",
            [id]
        );
        await pool.end();

        if (rows.length === 0) return null;

        return new NguoiDung(rows[0]);
    }

    static async TimKiem(keyword) {
        const pool = await db();

        const searchTerm = `%${keyword}%`;
        const sql = `
            SELECT nd.*, p.Ten 
            FROM NguoiDung nd
            LEFT JOIN chitiethopdongthue cthdt ON nd.MaND = cthdt.MaND
            LEFT JOIN hopdongthue hdt ON cthdt.MaHDT = hdt.MaHDT AND hdt.NgayKT > CURRENT_DATE
            LEFT JOIN phong p ON hdt.MaPhong = p.MaPhong
            WHERE nd.HoTen LIKE ? 
               OR nd.SDT LIKE ? 
               OR nd.CCCD LIKE ?
               OR p.Ten LIKE ?
            ORDER BY p.Ten ASC, nd.HoTen
        `;

        // 3. Truyền tham số (Vì có 3 dấu ? nên phải truyền searchTerm 3 lần)
        const [rows] = await pool.query(sql, [searchTerm, searchTerm, searchTerm, searchTerm]);
        await pool.end();

        return rows.map(row => new NguoiDung(row));
    }
    static async LayBangMaHDT(id) {
        const pool = await db();

        const [rows] = await pool.query(
            "SELECT nd.* FROM nguoidung nd JOIN chitiethopdongthue cthdt ON cthdt.MaND=nd.MaND WHERE cthdt.MaHDT=?",
            [id]
        );
        await pool.end();

        if (rows.length === 0) return null;

        return rows;
    }
    static async LayTatCa() {
        const pool = await db();

        const [rows] = await pool.query(`
            SELECT nd.*, p.Ten
            FROM NguoiDung nd
            LEFT JOIN chitiethopdongthue cthdt ON nd.MaND = cthdt.MaND
            LEFT JOIN hopdongthue hdt ON cthdt.MaHDT = hdt.MaHDT AND hdt.NgayKT > CURRENT_DATE 
            LEFT JOIN phong p ON hdt.MaPhong = p.MaPhong
            ORDER BY p.Ten ASC, nd.HoTen
        `);
        await pool.end();

        return rows.map(row => new NguoiDung(row));
    }
    static async LayDSNguoiDungChuaThue() {
        const pool = await db();

        const [rows] = await pool.query(`
           SELECT * FROM nguoidung
            WHERE Quyen = "user" 
            AND MaND NOT IN 
            (SELECT cthdt.MaND 
            FROM chitiethopdongthue cthdt 
            LEFT JOIN hopdongthue hdt 
            ON cthdt.MaHDT = hdt.MaHDT 
            WHERE hdt.NgayKT > CURRENT_DATE) 
        `);
        await pool.end();

        return rows.map(row => new NguoiDung(row));
    }
    static async LayDSNguoiDungDaThue() {
        const pool = await db();

        const [rows] = await pool.query(`
           SELECT * FROM nguoidung
            WHERE Quyen = "user" 
            AND MaND IN 
            (SELECT cthdt.MaND 
            FROM chitiethopdongthue cthdt 
            LEFT JOIN hopdongthue hdt 
            ON cthdt.MaHDT = hdt.MaHDT 
            WHERE hdt.NgayKT > CURRENT_DATE) 
        `);
        await pool.end();

        return rows.map(row => new NguoiDung(row));
    }
    static async LayDSNguoiDungDeThongBao() {
        const pool = await db();

        const [rows] = await pool.query(`
           SELECT * FROM nguoidung
            WHERE Quyen = 'admin' OR MaND IN 
            (SELECT cthdt.MaND 
            FROM chitiethopdongthue cthdt 
            LEFT JOIN hopdongthue hdt 
            ON cthdt.MaHDT = hdt.MaHDT 
            WHERE hdt.NgayKT > CURRENT_DATE) 
        `);
        await pool.end();

        return rows.map(row => new NguoiDung(row));
    }
    static async KiemTra(TenBien, GiaTri, MaND = null) {
        const pool = await db();
        
        let sql = `SELECT MaND FROM NguoiDung WHERE ${TenBien} = ?`;
        const params = [GiaTri];

        if (MaND) {
            sql += ` AND MaND != ?`;
            params.push(MaND);
        }

        sql += ` LIMIT 1`;

        const [rows] = await pool.query(sql, params);
        await pool.end();

        if (rows.length > 0) {
            return rows[0].MaND; 
        }
        
        return null; // Không tìm thấy thì trả về null
    }

    static async Them(data) {
        const pool = await db();

        const sql = `
            INSERT INTO NguoiDung (HoTen, CCCD, NamSinh, SDT, ThuongTru, TenTK, MatKhau, Quyen, AVT)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            data.HoTen,
            data.CCCD,
            data.NamSinh,
            data.SDT,
            data.ThuongTru,
            data.TenTK,
            data.MatKhau,
            data.Quyen,
            data.AVT
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return this.LayBangMaND(result.insertId);
    }
    static async Sua(id, data) {
        const pool = await db();

        const sql = `
            UPDATE NguoiDung
            SET HoTen = ?, CCCD = ?, NamSinh = ?, SDT = ?, ThuongTru = ?, Quyen = ?, AVT = ?
            WHERE MaND = ?
        `;

        const params = [
            data.HoTen, 
            data.CCCD, 
            data.NamSinh, 
            data.SDT, 
            data.ThuongTru, 
            data.Quyen, 
            data.AVT, 
            id
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return this.LayBangMaND(result.insertId);
    }
    static async CapNhatThongTinCaNhan(id, data) {
        const pool = await db();

        const sql = `
            UPDATE NguoiDung
            SET HoTen = ?, CCCD = ?, NamSinh = ?, SDT = ?, ThuongTru = ?,  AVT = ?
            WHERE MaND = ?
        `;

        const params = [
            data.HoTen, 
            data.CCCD, 
            data.NamSinh,
            data.SDT, 
            data.ThuongTru, 
            data.AVT,
            id
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return this.LayBangMaND(result.insertId);
    }

    static async DatLaiMatKhau(id) {
        const pool = await db();
        const nd = await NguoiDung.getById(id);

        const newpass = await MaHoa.MaHoaMatKhau(nd.TenTK);

        const sql = `
            UPDATE NguoiDung
            SET MatKhau = ?
            WHERE MaND = ?
        `;

        const params = [
            newpass,
            id
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return this.LayBangMaND(result.insertId);
    }
    static async DoiMatKhau(id, MatKhauMoi) {
        const pool = await db();

        const sql = `
            UPDATE NguoiDung
            SET MatKhau = ?
            WHERE MaND = ?
        `;

        const params = [
            MatKhauMoi,
            id
        ];

        const [result] = await pool.query(sql, params);
        await pool.end();

        return  this.LayBangMaND(id);
    }

    // ----------- 3. XÓA NGƯỜI DÙNG (DELETE) -----------
    static async Xoa(id) {
        const pool = await db();

        const sql = `DELETE FROM NguoiDung WHERE MaND = ?`;

        await pool.query(sql, [id]);
        await pool.end();

        return this.LayTatCa();
    }
}

module.exports = NguoiDung;
