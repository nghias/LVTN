import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-white p-4">
      <Link
        href="/auth"
        className="px-8 py-3.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-base shadow-md border border-teal-300 transition no-underline"
      >
        Đi đến trang Đăng nhập
      </Link>
    </main>
  );
}