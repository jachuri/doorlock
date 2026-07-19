import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** GET — 매입 조회 */
export async function GET({ url }) {
  const sql = getSQL();
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const suppliers = url.searchParams.get('suppliers');

  // 매입처 목록 요청 (마스터 목록 — 카테고리 관리 화면에서 이름을 고치면 여기도 반영됨)
  if (suppliers !== null) {
    const rows = await sql`
      SELECT name FROM suppliers ORDER BY name ASC
    `;
    return json(rows.map(r => r.name));
  }

  let rows;

  if (start && end) {
    rows = await sql`
      SELECT p.*, COALESCE(s.category, '기타') AS category
      FROM purchases p
      LEFT JOIN suppliers s ON s.name = p.supplier
      WHERE p.date >= ${start} AND p.date <= ${end}
      ORDER BY p.date DESC
    `;
  } else {
    rows = await sql`
      SELECT p.*, COALESCE(s.category, '기타') AS category
      FROM purchases p
      LEFT JOIN suppliers s ON s.name = p.supplier
      ORDER BY p.date DESC
    `;
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

  // 새 매입처면 마스터 목록에 '기타'로 자동 등록
  await sql`INSERT INTO suppliers (name) VALUES (${supplier}) ON CONFLICT (name) DO NOTHING`;

  return json({ success: true, id: rows[0].id });
}
