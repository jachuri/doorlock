import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** GET — 전체 데이터 백업 (JSON) */
export async function GET() {
  const sql = getSQL();
  const services = await sql`SELECT * FROM services ORDER BY date ASC, time ASC`;
  const purchases = await sql`SELECT * FROM purchases ORDER BY date ASC`;

  // camelCase 변환
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

/** POST — 데이터 복원 */
export async function POST({ request }) {
  const sql = getSQL();
  const data = await request.json();

  // 기존 데이터 삭제
  await sql`DELETE FROM services`;
  await sql`DELETE FROM purchases`;

  // 서비스 복원
  if (data.services?.length > 0) {
    for (const s of data.services) {
      await sql`
        INSERT INTO services (date, time, payment_method, amount, parts_cost, memo)
        VALUES (${s.date}, ${s.time || null}, ${s.paymentMethod || '카드'}, ${s.amount}, ${s.partsCost || 0}, ${s.memo || ''})
      `;
    }
  }

  // 매입 복원
  if (data.purchases?.length > 0) {
    for (const p of data.purchases) {
      await sql`
        INSERT INTO purchases (date, supplier, amount, memo)
        VALUES (${p.date}, ${p.supplier}, ${p.amount}, ${p.memo || ''})
      `;
    }
  }

  return json({ success: true, message: '복원 완료' });
}

/** DELETE — 전체 데이터 삭제 */
export async function DELETE() {
  const sql = getSQL();
  await sql`DELETE FROM services`;
  await sql`DELETE FROM purchases`;
  return json({ success: true, message: '전체 데이터 삭제 완료' });
}
