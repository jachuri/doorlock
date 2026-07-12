import { redirect } from '@sveltejs/kit';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  const { pathname } = event.url;

  // 로그인 페이지와 인증/초기화 API는 항상 접근 허용
  if (pathname === '/login' || pathname === '/api/auth' || pathname === '/api/db/init') {
    return resolve(event);
  }

  // 위젯 API는 쿠키 대신 자체 헤더(x-widget-key) 인증을 사용하므로 통과
  if (pathname === '/api/widget/summary') {
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
