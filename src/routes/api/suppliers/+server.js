import { json, error } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

const CATEGORIES = ['광고', '재고', '비품', '기타'];

/** GET — 매입처 목록 (매입 건수/합계 포함) */
export async function GET() {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      s.id,
      s.name,
      s.category,
      COALESCE(p.cnt, 0)::int AS purchase_count,
      COALESCE(p.total, 0)::int AS purchase_total
    FROM suppliers s
    LEFT JOIN (
      SELECT supplier, COUNT(*) AS cnt, SUM(amount) AS total
      FROM purchases
      GROUP BY supplier
    ) p ON p.supplier = s.name
    ORDER BY s.name ASC
  `;

  return json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      purchaseCount: r.purchase_count,
      purchaseTotal: r.purchase_total
    }))
  );
}

/** POST — 매입처 수동 등록 (매입 이력 없이 미리 분류해두고 싶을 때) */
export async function POST({ request }) {
  const sql = getSQL();
  const { name, category } = await request.json();

  const trimmedName = (name || '').trim();
  if (!trimmedName) throw error(400, '매입처 이름을 입력해주세요');

  const finalCategory = CATEGORIES.includes(category) ? category : '기타';

  const rows = await sql`
    INSERT INTO suppliers (name, category)
    VALUES (${trimmedName}, ${finalCategory})
    ON CONFLICT (name) DO NOTHING
    RETURNING id
  `;

  if (rows.length === 0) throw error(409, '이미 등록된 매입처입니다');

  return json({ success: true, id: rows[0].id });
}
