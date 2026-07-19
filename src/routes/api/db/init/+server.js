import { json } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/** 테이블 초기화 — 브라우저에서 접속하면 자동 실행 */
export async function GET() {
  return initDB();
}

export async function POST() {
  return initDB();
}

async function initDB() {
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

  await sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      category VARCHAR(20) NOT NULL DEFAULT '기타'
        CHECK (category IN ('광고', '재고', '비품', '기타')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_services_date ON services(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)`;

  // 기존에 쌓인 매입처를 마스터 목록에 백필 (신규 매입처는 기본값 '기타')
  await sql`
    INSERT INTO suppliers (name)
    SELECT DISTINCT supplier FROM purchases
    ON CONFLICT (name) DO NOTHING
  `;

  return json({ success: true, message: '테이블 초기화 완료' });
}
