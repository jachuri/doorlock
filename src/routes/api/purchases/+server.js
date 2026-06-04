import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** GET — 매입 조회 */
export async function GET({ url }) {
  const sql = getSQL();
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const suppliers = url.searchParams.get('suppliers');

  // 매입처 목록 요청
  if (suppliers !== null) {
    const rows = await sql`
      SELECT DISTINCT supplier FROM purchases ORDER BY supplier ASC
    `;
    return json(rows.map(r => r.supplier));
  }

  let rows;

  if (start && end) {
    rows = await sql`
      SELECT * FROM purchases WHERE date >= ${start} AND date <= ${end}
      ORDER BY date DESC
    `;
  } else {
    rows = await sql`SELECT * FROM purchases ORDER BY date DESC`;
  }

  return json(rows);
}

/** POST — 매입 추가 */
export async function POST({ request }) {
  const sql = getSQL();
  const { date, supplier, amount, memo } = await request.json();

  const rows = await sql`
    INSERT INTO purchases (date, supplier, amount, memo)
    VALUES (${date}, ${supplier}, ${amount}, ${memo || ''})
    RETURNING id
  `;

  return json({ success: true, id: rows[0].id });
}
