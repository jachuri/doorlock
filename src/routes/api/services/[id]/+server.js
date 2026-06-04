import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** PUT — 매출 수정 */
export async function PUT({ params, request }) {
  const sql = getSQL();
  const id = params.id;
  const { date, time, paymentMethod, amount, partsCost, memo } = await request.json();

  await sql`
    UPDATE services SET
      date = ${date},
      time = ${time || null},
      payment_method = ${paymentMethod || '카드'},
      amount = ${amount},
      parts_cost = ${partsCost || 0},
      memo = ${memo || ''}
    WHERE id = ${id}
  `;

  return json({ success: true });
}

/** DELETE — 매출 삭제 */
export async function DELETE({ params }) {
  const sql = getSQL();
  await sql`DELETE FROM services WHERE id = ${params.id}`;
  return json({ success: true });
}
