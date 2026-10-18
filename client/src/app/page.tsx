'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';

// ==========================================
// 1. DỮ LIỆU MẪU (MOCK DATA)
// Tách dữ liệu ra ngoài để dễ quản lý, sau này thay bằng API gọi từ Database
// ==========================================
const FEATURED_ROOMS = [
  { id: 1, title: 'Phòng trọ ban công thoáng mát Quận 7', price: '3.500.000đ', area: '25m²', location: 'Quận 7, TP.HCM', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=600&auto=format&fit=crop' },
  { id: 2, title: 'Studio đầy đủ nội thất gần ĐH Tôn Đức Thắng', price: '5.000.000đ', area: '30m²', location: 'Bình Chánh, TP.HCM', img: 'https://images.unsplash.com/photo-1502672260266-1c1de2422008?q=80&w=600&auto=format&fit=crop' },
  { id: 3, title: 'Phòng trọ giá sinh viên Đình Văn Ước', price: '1.800.000đ', area: '15m²', location: 'Bình Chánh, TP.HCM', img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=600&auto=format&fit=crop' },
  { id: 4, title: 'Căn hộ mini an ninh 24/7', price: '4.200.000đ', area: '28m²', location: 'Quận 8, TP.HCM', img: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?q=80&w=600&auto=format&fit=crop' },
];

const PRICING_PACKAGES = [
  { id: 1, name: 'GÓI ĐĂNG TIN', price: '99.000đ', period: '/tháng', desc: 'Dành cho chủ trọ chỉ có nhu cầu tìm khách thuê nhanh chóng.', features: ['Đăng tối đa 10 tin', 'Hiển thị trên bản đồ', 'Hỗ trợ SEO cơ bản'], recommended: false },
  { id: 2, name: 'COMBO VIP', price: '299.000đ', period: '/tháng', desc: 'Giải pháp toàn diện nhất để tự động hóa công việc kinh doanh.', features: ['Không giới hạn tin đăng', 'Quản lý tối đa 100 phòng', 'Tự động tính điện nước', 'Xuất hợp đồng, hóa đơn PDF', 'Hỗ trợ CSKH 24/7'], recommended: true },
  { id: 3, name: 'GÓI QUẢN LÝ', price: '199.000đ', period: '/tháng', desc: 'Dành cho chủ trọ đã có khách, cần phần mềm quản lý thu chi.', features: ['Quản lý tối đa 50 phòng', 'Tính tiền điện, nước, dịch vụ', 'Quản lý hợp đồng, khách thuê'], recommended: false },
];

// ==========================================
// 2. CÁC COMPONENTS ĐỘC LẬP (UI BLOCKS)
// Sau này bạn có thể copy mỗi function này ra một file riêng (VD: Header.tsx)
// ==========================================

const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 transition-all duration-500">
      <nav className={`flex items-center justify-between glass-panel shadow-2xl rounded-full transition-all duration-500 ease-in-out ${scrolled ? 'w-full max-w-4xl py-2 px-6' : 'w-full max-w-6xl py-3 px-8'}`}>
        <a className="flex items-center gap-3 group" href="/">
          <div className="bg-white p-1.5 rounded-full shadow-sm group-hover:shadow-md transition-all">
            <img src="/img/logo.png" alt="Logo" className="h-8 w-8 object-cover rounded-full" onError={(e) => { e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/1946/1946436.png" }} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-emerald-800 hidden sm:block">XÓM TRỌ</span>
        </a>
        
        <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-slate-700">
          <a href="#danh-sach-phong" className="hover:text-emerald-600 transition-colors">Tìm Phòng</a>
          <a href="#goi-dich-vu" className="hover:text-emerald-600 transition-colors">Bảng Giá</a>
          <a href="#ve-chung-toi" className="hover:text-emerald-600 transition-colors">Tính Năng</a>
        </div>

        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm font-bold text-slate-700 hover:text-emerald-600 px-4 py-2 transition-colors">Đăng nhập</a>
          <a href="/register" className="hidden sm:inline-block text-sm font-bold bg-emerald-600 text-white px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 hover:scale-105 transition-all">
            Đăng ký
          </a>
        </div>
      </nav>
    </header>
  );
};

const HeroSection = () => (
  <section className="relative flex flex-col items-center justify-center text-center min-h-[70vh] rounded-[3rem] glass-panel shadow-2xl p-8 md:p-20 overflow-hidden">
    {/* Vòng tròn mờ trang trí */}
    <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
    <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

    <div className="relative z-10 max-w-4xl mx-auto">
      <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 font-semibold text-sm backdrop-blur-sm">
        🌟 Giải pháp công nghệ BĐS cho thuê 2026
      </div>
      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
        Thuê Phòng Dễ Dàng. <br/>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600">Quản Lý Thảnh Thơi.</span>
      </h1>
      <p className="text-lg md:text-xl text-slate-700 mb-10 max-w-2xl mx-auto font-medium">
        Nền tảng số 1 kết nối người tìm phòng trọ ưng ý và cung cấp hệ thống quản lý thu chi, hợp đồng điện tử tự động cho Chủ trọ.
      </p>
      
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <a href="#danh-sach-phong" className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
          <i className="bi bi-search"></i> Tìm phòng ngay
        </a>
        <a href="/host/dang-tin" className="w-full sm:w-auto px-8 py-4 bg-white text-emerald-700 border-2 border-transparent hover:border-emerald-200 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
          <i className="bi bi-house-add"></i> Đăng tin cho thuê
        </a>
      </div>
    </div>
  </section>
);

const RoomList = () => (
  <section id="danh-sach-phong" className="scroll-mt-32">
    <div className="flex justify-between items-end mb-10">
      <div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">Phòng Trọ Nổi Bật</h2>
        <p className="text-slate-700 font-medium">Khám phá các không gian sống tiện nghi, an ninh 24/7.</p>
      </div>
      <a href="/phong-tro" className="hidden sm:flex items-center gap-2 text-emerald-800 font-bold hover:text-emerald-900 transition-colors">
        Xem tất cả <i className="bi bi-arrow-right"></i>
      </a>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {FEATURED_ROOMS.map((room) => (
        <div key={room.id} className="glass-card rounded-[2rem] overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-2 group cursor-pointer">
          <div className="relative h-56 overflow-hidden p-2">
            <img src={room.img} alt={room.title} className="w-full h-full object-cover rounded-3xl group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
              {room.area}
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-2">
              <i className="bi bi-geo-alt-fill text-rose-500"></i> {room.location}
            </div>
            <h3 className="font-bold text-lg text-slate-900 leading-snug mb-3 line-clamp-2">{room.title}</h3>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200/50">
              <span className="text-xl font-extrabold text-emerald-600">{room.price}</span>
              <button className="bg-slate-100 hover:bg-emerald-50 text-emerald-700 p-2 rounded-full transition-colors">
                <i className="bi bi-arrow-up-right"></i>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const PricingSection = () => (
  <section id="goi-dich-vu" className="scroll-mt-32">
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Giải Pháp Dành Cho Chủ Trọ</h2>
      <p className="text-slate-700 font-medium">Nâng cấp quản lý, tối đa hóa lợi nhuận với chi phí tiết kiệm nhất.</p>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
      {PRICING_PACKAGES.map((pkg) => (
        <div key={pkg.id} className={`relative glass-card rounded-[2.5rem] p-8 transition-all duration-300 hover:-translate-y-2 ${pkg.recommended ? 'ring-4 ring-emerald-400 shadow-2xl bg-white/80 scale-100 lg:scale-105 z-10' : 'shadow-lg'}`}>
          {pkg.recommended && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
              KHUYÊN DÙNG
            </div>
          )}
          <h4 className="text-sm font-bold text-emerald-700 tracking-wider mb-2 uppercase">{pkg.name}</h4>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-4xl font-black text-slate-900">{pkg.price}</span>
            <span className="text-slate-600 font-medium">{pkg.period}</span>
          </div>
          <p className="text-slate-600 font-medium text-sm mb-8 h-10">{pkg.desc}</p>
          
          <ul className="space-y-4 mb-8">
            {pkg.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <i className="bi bi-check-circle-fill text-emerald-500 mt-0.5"></i>
                <span className="text-slate-700 font-medium text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          
          <a href={`/mua-goi/${pkg.id}`} className={`block w-full text-center py-4 rounded-full font-bold transition-all ${pkg.recommended ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
            Bắt đầu ngay
          </a>
        </div>
      ))}
    </div>
  </section>
);

const FeatureSection = () => (
  <section id="ve-chung-toi" className="scroll-mt-32">
    <div className="glass-panel rounded-[3rem] p-10 md:p-16 shadow-xl relative overflow-hidden">
      <div className="text-center mb-12 relative z-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">Hệ sinh thái An Toàn & Chuẩn Mực</h2>
        <p className="text-slate-700 font-medium">Bảo vệ quyền lợi của bạn là ưu tiên hàng đầu của chúng tôi.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        <div className="bg-white/50 backdrop-blur-md rounded-3xl p-8 text-center hover:bg-white/80 transition-colors shadow-sm">
          <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner"><i className="bi bi-file-earmark-check-fill"></i></div>
          <h5 className="font-extrabold text-xl text-slate-900 mb-3">Hợp đồng pháp lý</h5>
          <p className="text-slate-600 font-medium text-sm leading-relaxed">Toàn bộ giao dịch được số hóa thông qua hợp đồng điện tử chặt chẽ, minh bạch điều khoản giữa hai bên.</p>
        </div>
        <div className="bg-white/50 backdrop-blur-md rounded-3xl p-8 text-center hover:bg-white/80 transition-colors shadow-sm">
          <div className="w-16 h-16 mx-auto bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner"><i className="bi bi-person-bounding-box"></i></div>
          <h5 className="font-extrabold text-xl text-slate-900 mb-3">Xác thực danh tính</h5>
          <p className="text-slate-600 font-medium text-sm leading-relaxed">Cộng đồng văn minh, an toàn nhờ quy trình xác thực định danh (KYC) bắt buộc qua Căn cước công dân và SĐT.</p>
        </div>
        <div className="bg-white/50 backdrop-blur-md rounded-3xl p-8 text-center hover:bg-white/80 transition-colors shadow-sm">
          <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner"><i className="bi bi-headset"></i></div>
          <h5 className="font-extrabold text-xl text-slate-900 mb-3">Hỗ trợ tức thì 24/7</h5>
          <p className="text-slate-600 font-medium text-sm leading-relaxed">Đội ngũ pháp chế và CSKH luôn đồng hành, sẵn sàng giải quyết khiếu nại hay sự cố bất kỳ lúc nào.</p>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  // Dùng relative để chứa absolute SVG Curve
  <footer className="relative bg-slate-900 text-slate-300 pt-24 pb-10 mt-20" id="lien-he">
    
    {/* SVG Wave tạo hiệu ứng chuyển tiếp cong mượt mà giữa Background Gradient và Footer */}
    <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] -translate-y-[99%]">
        <svg className="relative block w-full h-[60px] md:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C50.29,15.1,100.86,30.34,155,42.55,210.45,55.13,265.8,66.5,321.39,56.44Z" className="fill-slate-900"></path>
        </svg>
    </div>

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
        <div>
          <a className="flex items-center gap-2 mb-6" href="/">
            <img src="/img/logo.png" alt="Logo" className="h-10 w-10 bg-white rounded-full p-1" onError={(e) => { e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/1946/1946436.png" }} />
            <b className="text-white text-2xl font-extrabold tracking-tight">XÓM TRỌ</b>
          </a>
          <p className="text-sm font-medium leading-relaxed text-slate-400 mb-6">Nền tảng công nghệ số 1 Việt Nam kết nối người tìm phòng và cung cấp phần mềm quản lý vận hành nhà trọ.</p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><i className="bi bi-facebook"></i></a>
            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><i className="bi bi-youtube"></i></a>
            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"><i className="bi bi-tiktok"></i></a>
          </div>
        </div>
        
        <div>
          <h5 className="text-white font-bold mb-6 text-lg">Khám Phá</h5>
          <ul className="space-y-3 font-medium text-sm">
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Về chúng tôi</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Bảng giá dịch vụ</a></li>
          </ul>
        </div>
        
        <div>
          <h5 className="text-white font-bold mb-6 text-lg">Chính Sách</h5>
          <ul className="space-y-3 font-medium text-sm">
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Bảo mật thông tin</a></li>
            <li><a href="#" className="hover:text-emerald-400 transition-colors">Quy chế hoạt động</a></li>
          </ul>
        </div>
        
        <div>
          <h5 className="text-white font-bold mb-6 text-lg">Liên Hệ</h5>
          <ul className="space-y-4 font-medium text-sm">
            <li className="flex items-start gap-3">
              <i className="bi bi-geo-alt-fill text-emerald-500 mt-0.5 text-lg"></i>
              <span>E15/64A Đinh Văn Ước, Hưng Long, Bình Chánh, TP.HCM</span>
            </li>
            <li className="flex items-center gap-3">
              <i className="bi bi-telephone-fill text-emerald-500 text-lg"></i>
              <a href="tel:0931493785" className="hover:text-emerald-400 transition-colors">0931 493 785</a>
            </li>
          </ul>
        </div>
      </div>
      
      <div className="pt-8 border-t border-slate-800 text-center flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500">
        <p className="mb-0">© 2026 Bản quyền thuộc về Xóm Trọ. Giấy CNĐK DN số 0109154368.</p>
        <p className="mb-0">Thiết kế với <i className="bi bi-heart-fill text-rose-500 mx-1"></i> tại Việt Nam</p>
      </div>
    </div>
  </footer>
);

// ==========================================
// 3. MAIN COMPONENT (Lắp ráp các khối lại)
// ==========================================
export default function Home() {
  return (
    <div 
      className="min-h-screen text-slate-800 font-sans selection:bg-emerald-300 selection:text-emerald-900 relative"
      // Màu nền gốc của bạn được đẩy xuống component cha cùng nhất
      style={{ background: 'linear-gradient(to bottom right, rgb(0, 255, 149), rgba(0, 80, 200, 0.4))' }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

      {/* CSS tái sử dụng */}
      <style dangerouslySetInnerHTML={{
        __html: `
          body { font-family: 'Montserrat', sans-serif; }
          .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5); }
          .glass-card { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.6); }
          .glass-card:hover { background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.9); }
        `
      }} />

      {/* Gọi các block component đã chia ở trên */}
      <Header />
      
      {/* Bao bọc phần nội dung bằng thẻ main để chia khoảng cách */}
      <main className="pt-32 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-32">
        <HeroSection />
        <RoomList />
        <PricingSection />
        <FeatureSection />
      </main>

      <Footer />

      <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" strategy="lazyOnload" />
    </div>
  );
}