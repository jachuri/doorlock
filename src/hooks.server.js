import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const { pathname } = event.url;

  // 로그인 페이지와 인증 API는 항상 접근 허용
  if (pathname === '/login' || pathname === '/api/auth') {
    return resolve(event);
  }

  // 정적 파일은 통과
  if (
    pathname.startsWith('/_app') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon-') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/robots')
  ) {
    return resolve(event);
  }

  // 인증 쿠키 확인
  const auth = event.cookies.get('auth');
  if (auth !== 'authenticated') {
    throw redirect(302, '/login');
  }

  return resolve(event);
}
