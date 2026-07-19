import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** PUT — 매입 수정 */
export async function PUT({ params, request }) {
  const sql = getSQL();
  const id = params.id;
  const { date, supplier, amount, memo } = await request.json();

  await sql`
    UPDATE purchases SET
      date = ${date},
      supplier = ${supplier},
      amount = ${amount},
      memo = ${memo || ''}
    WHERE id = ${id}
  `;

  // 새 매입처면 마스터 목록에 '기타'로 자동 등록
  await sql`INSERT INTO suppliers (name) VALUES (${supplier}) ON CONFLICT (name) DO NOTHING`;

  return json({ success: true });
}

/** DELETE — 매입 삭제 */
export async function DELETE({ params }) {
  const sql = getSQL();
  await sql`DELETE FROM purchases WHERE id = ${params.id}`;
  return json({ success: true });
}
