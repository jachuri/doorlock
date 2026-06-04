import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** 테이블 초기화 — 최초 1회 호출 */
export async function POST() {
  const sql = getSQL();

  await sql`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      date VARCHAR(10) NOT NULL,
      time VARCHAR(5),
      payment_method VARCHAR(20) NOT NULL DEFAULT '카드',
      amount INTEGER NOT NULL,
      parts_cost INTEGER DEFAULT 0,
      memo TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      date VARCHAR(10) NOT NULL,
      supplier VARCHAR(100) NOT NULL,
      amount INTEGER NOT NULL,
      memo TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_services_date ON services(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date)`;

  return json({ success: true, message: '테이블 초기화 완료' });
}
