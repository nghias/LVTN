const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function docBlockBaSo(so: number, dayDu: boolean): string {
  let ketQua = '';
  const tram = Math.floor(so / 100);
  const chuc = Math.floor((so % 100) / 10);
  const donVi = so % 10;

  if (tram > 0 || dayDu) {
    ketQua += ` ${CHU_SO[tram]} trăm`;
  }

  if (chuc > 1) {
    ketQua += ` ${CHU_SO[chuc]} mươi`;
    if (donVi === 1) ketQua += ' mốt';
    else if (donVi === 5) ketQua += ' lăm';
    else if (donVi > 0) ketQua += ` ${CHU_SO[donVi]}`;
  } else if (chuc === 1) {
    ketQua += ' mười';
    if (donVi === 5) ketQua += ' lăm';
    else if (donVi > 0) ketQua += ` ${CHU_SO[donVi]}`;
  } else if (dayDu && donVi > 0) {
    ketQua += ` lẻ ${CHU_SO[donVi]}`;
  } else if (donVi > 0) {
    ketQua += ` ${CHU_SO[donVi]}`;
  }

  return ketQua;
}

export function docSoTienThanhChu(soTien: number): string {
  const so = Math.round(Number(soTien) || 0);
  if (so === 0) return 'Không đồng';

  const donViNhom = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ'];
  let soConLai = so;
  let i = 0;
  const cacCum: string[] = [];

  while (soConLai > 0) {
    const block = soConLai % 1000;
    soConLai = Math.floor(soConLai / 1000);
    if (block > 0) {
      const chuBlock = docBlockBaSo(block, soConLai > 0);
      cacCum.unshift(`${chuBlock}${donViNhom[i]}`);
    }
    i++;
  }

  const chuoi = cacCum.join('').trim() + ' đồng chẵn.';
  return chuoi.charAt(0).toUpperCase() + chuoi.slice(1);
}

export function dinhDangTienVN(soTien: number | string): string {
  return Number(soTien || 0).toLocaleString('vi-VN');
}

export function dinhDangNgayVN(dateStr?: string | null): string {
  if (!dateStr) return '....../....../20......';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '....../....../20......';
  const ngay = String(d.getDate()).padStart(2, '0');
  const thang = String(d.getMonth() + 1).padStart(2, '0');
  const nam = d.getFullYear();
  return `${ngay}/${thang}/${nam}`;
}

export function tinhSoThangThue(ngayBD: string, ngayKT: string): number {
  const d1 = new Date(ngayBD);
  const d2 = new Date(ngayKT);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 12;
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  return months > 0 ? months : 1;
}