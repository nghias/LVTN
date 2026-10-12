const fs = require("fs");
const path = require("path");

function deleteImage(filename) {
    if (!filename || filename === "logo.png") return; // Không xóa ảnh mặc định

    const filePath = path.join(__dirname, "../../public/img", filename);

    fs.unlink(filePath, (err) => {
        if (err) console.log("Không thể xóa ảnh:", err.message);
        else console.log("Đã xóa ảnh:", filename);
    });
}
module.exports=deleteImage;