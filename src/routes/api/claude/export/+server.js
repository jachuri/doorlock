import { json, error } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/**
 * GET /api/claude/export
 * 읽기 전용 전체 데이터 조회 — 쿠키 대신 x-claude-key 헤더로 인증.
 * APP_PASSWORD와 무관한 별도 키이며, 이 라우트에는 쓰기/삭제 핸들러가 없다.
 */
export async function GET({ request }) {
  const exportKey = process.env.CLAUDE_DATA_KEY;
  const key = request.headers.get('x-claude-key');
  if (!exportKey || key !== exportKey) {
    throw error(401, '인증 실패');
  }

  const sql = getSQL();
  const services = await sql`SELECT * FROM services ORDER BY date ASC, time ASC`;
  const purchases = await sql`SELECT * FROM purchases ORDER BY date ASC`;

  const servicesData = services.map(r => ({
    id: r.id,
    date: r.date,
    time: r.time,
    paymentMethod: r.payment_method,
    amount: r.amount,
    partsCost: r.parts_cost,
    memo: r.memo
  }));

  return json({
    version: 1,
    exportedAt: new Date().toISOString(),
    services: servicesData,
    purchases
  });
}
