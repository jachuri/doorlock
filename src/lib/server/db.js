import { neon } from '@neondatabase/serverless';

/**
 * Neon SQL 클라이언트 반환
 * Vercel 환경변수 POSTGRES_URL 또는 DATABASE_URL 사용
 */
export function getSQL() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL 환경변수가 설정되지 않았습니다');
  }
  return neon(url);
}
