import { json, error } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

const CATEGORIES = ['광고', '재고', '비품', '기타'];

/**
 * PUT — 매입처 이름/카테고리 수정
 * 이름을 기존의 다른 매입처 이름으로 바꾸면 "병합"으로 처리:
 * 해당 매입처가 쓰인 모든 매입 기록의 supplier를 새 이름으로 옮기고,
 * 지금 수정 중인(오타) 매입처 행은 삭제한다.
 */
export async function PUT({ params, request }) {
  const sql = getSQL();
  const id = params.id;
  const { name, category } = await request.json();

  const trimmedName = (name || '').trim();
  if (!trimmedName) throw error(400, '매입처 이름을 입력해주세요');
  if (!CATEGORIES.includes(category)) throw error(400, '올바르지 않은 카테고리입니다');

  const [current] = await sql`SELECT id, name FROM suppliers WHERE id = ${id}`;
  if (!current) throw error(404, '매입처를 찾을 수 없습니다');

  if (trimmedName === current.name) {
    await sql`UPDATE suppliers SET category = ${category} WHERE id = ${id}`;
    return json({ success: true, merged: false });
  }

  const [conflict] = await sql`SELECT id FROM suppliers WHERE name = ${trimmedName} AND id != ${id}`;

  if (conflict) {
    // 병합: 오타 매입처의 매입 기록을 정식 매입처 이름으로 옮기고, 오타 행은 삭제
    await sql`UPDATE purchases SET supplier = ${trimmedName} WHERE supplier = ${current.name}`;
    await sql`DELETE FROM suppliers WHERE id = ${id}`;
    await sql`UPDATE suppliers SET category = ${category} WHERE id = ${conflict.id}`;
    return json({ success: true, merged: true, mergedIntoId: conflict.id });
  }

  await sql`UPDATE suppliers SET name = ${trimmedName}, category = ${category} WHERE id = ${id}`;
  await sql`UPDATE purchases SET supplier = ${trimmedName} WHERE supplier = ${current.name}`;
  return json({ success: true, merged: false });
}

/** DELETE — 매입 이력이 없는 매입처만 삭제 허용 */
export async function DELETE({ params }) {
  const sql = getSQL();
  const id = params.id;

  const [current] = await sql`SELECT name FROM suppliers WHERE id = ${id}`;
  if (!current) throw error(404, '매입처를 찾을 수 없습니다');

  const [{ cnt }] = await sql`SELECT COUNT(*)::int AS cnt FROM purchases WHERE supplier = ${current.name}`;
  if (cnt > 0) throw error(400, '매입 내역이 있는 매입처는 삭제할 수 없습니다');

  await sql`DELETE FROM suppliers WHERE id = ${id}`;
  return json({ success: true });
}
