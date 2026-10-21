const BASE_URL = process.env.NEXT_PUBLIC_API_URL + '/auth';

export async function httpRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    // Bắt buộc có credentials: 'include' để gửi/nhận HttpOnly Cookie bảo mật
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({
    success: false,
    message: 'Lỗi kết nối đến máy chủ!',
  }));

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Yêu cầu thất bại!');
  }

  return result;
}