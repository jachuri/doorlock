import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** GET — 매출 조회 (date, start/end 파라미터) */
export async function GET({ url }) {
  const sql = getSQL();
  const date = url.searchParams.get('date');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  let rows;

  if (date) {
    // 특정 날짜 조회
    rows = await sql`
      SELECT * FROM services WHERE date = ${date} ORDER BY time ASC
    `;
  } else if (start && end) {
    // 기간 조회
    rows = await sql`
      SELECT * FROM services WHERE date >= ${start} AND date <= ${end}
      ORDER BY date DESC, time DESC
    `;
  } else {
    // 전체 조회
    rows = await sql`SELECT * FROM services ORDER BY date DESC, time DESC`;
  }

  // 컬럼명 camelCase 변환
  const result = rows.map(r => ({
    id: r.id,
    date: r.date,
    time: r.time,
    paymentMethod: r.payment_method,
    amount: r.amount,
    partsCost: r.parts_cost,
    memo: r.memo
  }));

  return json(result);
}

/** POST — 매출 추가 */
export async function POST({ request }) {
  const sql = getSQL();
  const { date, time, paymentMethod, amount, partsCost, memo } = await request.json();

  const rows = await sql`
    INSERT INTO services (date, time, payment_method, amount, parts_cost, memo)
    VALUES (${date}, ${time || null}, ${paymentMethod || '카드'}, ${amount}, ${partsCost || 0}, ${memo || ''})
    RETURNING id
  `;

  return json({ success: true, id: rows[0].id });
}
