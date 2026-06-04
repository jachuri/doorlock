import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
  const { password } = await request.json();
  const appPassword = process.env.APP_PASSWORD || 'doorlock1234';

  if (password === appPassword) {
    // 인증 성공 — 7일 유효 쿠키 설정
    cookies.set('auth', 'authenticated', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7일
    });

    return json({ success: true });
  }

  return json({ success: false, message: '비밀번호가 틀렸습니다' }, { status: 401 });
}
