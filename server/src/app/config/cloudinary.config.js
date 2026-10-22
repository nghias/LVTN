const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const env = require('./env.config');

// 1. Kết nối Cloudinary với thông số từ .env
cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

// 2. Cấu hình kho lưu trữ tự động cho Ảnh Phòng Trọ
const phongStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'xomtro/phong', // Tự động tạo thư mục xomtro/phong trên Cloud
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }], // Tự động tối ưu dung lượng
  },
});

// 3. Cấu hình kho lưu trữ cho Ảnh Minh Chứng Thanh Toán (Bill)
const billStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'xomtro/bills',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});

const uploadAnhPhong = multer({
  storage: phongStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB/ảnh
});

const uploadAnhBill = multer({
  storage: billStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ============================================================================
// 4. HÀM TỰ ĐỘNG TRÍCH XUẤT PUBLIC_ID TỪ URL VÀ XÓA ẢNH TRÊN CLOUDINARY
// (Điểm cộng lớn: Không cần sửa cấu trúc bảng AnhPhong chỉ có cột DuongDan!)
// ============================================================================
/**
 * Ví dụ URL lưu trong cột DuongDan:
 * "https://res.cloudinary.com/demo/image/upload/v17100000/xomtro/phong/abc123xyz.jpg"
 * -> Hàm sẽ tự động tách lấy public_id là: "xomtro/phong/abc123xyz" để xóa trên Cloud
 */
const deleteImageFromCloudinary = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return false; // Bỏ qua nếu là ảnh dữ liệu mẫu cũ (/uploads/phong/...)
    }

    // Tách phần sau "/upload/"
    const parts = imageUrl.split('/upload/');
    if (parts.length < 2) return false;

    // Bỏ phần version (ví dụ: v1712345678/) và bỏ đuôi mở rộng (.jpg, .png)
    const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
    const publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.'));

    if (!publicId) return false;

    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Đã xóa ảnh trên Cloudinary [${publicId}]:`, result.result);
    return result.result === 'ok';
  } catch (error) {
    console.error('❌ Lỗi khi xóa ảnh trên Cloudinary:', error.message);
    return false;
  }
};

module.exports = {
  cloudinary,
  uploadAnhPhong,
  uploadAnhBill,
  deleteImageFromCloudinary,
};