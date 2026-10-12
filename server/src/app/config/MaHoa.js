const bcrypt = require('bcrypt');

class MaHoa {

    // Mã hoá mật khẩu
    static async MaHoaMatKhau(password) {
        return await bcrypt.hash(password, 12);
    }

    // So khớp mật khẩu
    static async SoSanh(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
}

module.exports = MaHoa;
