'use client';

import { useRouter } from 'next/navigation';
import { AuthService } from '../../services/auth.service';

export default function TopBar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    } finally {
      router.replace('/auth');
    }
  };

  return (
    <div className="w-full flex justify-end p-4 border-b border-gray-200 bg-white">
      <button
        onClick={handleLogout}
        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
      >
        Đăng xuất
      </button>
    </div>
  );
}