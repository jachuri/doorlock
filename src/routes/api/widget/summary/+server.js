import { json, error } from '@sveltejs/kit';
import { getSQL } from '$lib/server/db.js';

/**
 * GET /api/widget/summary?year=2026&month=7
 * 홈 화면 위젯 전용 — 쿠키 세션 대신 x-widget-key 헤더로 인증
 * 응답: 해당 월의 일별 매출/매입(원가)/순이익 + 월 종합 집계
 */
export async function GET({ url, request }) {
  const appPassword = process.env.APP_PASSWORD || 'doorlock1234';
  const key = request.headers.get('x-widget-key');
  if (key !== appPassword) {
    throw error(401, '인증 실패');
  }

  const year = Number(url.searchParams.get('year'));
  const month = Number(url.searchParams.get('month'));
  if (!year || !month || month < 1 || month > 12) {
    throw error(400, 'year, month 파라미터가 필요합니다 (예: ?year=2026&month=7)');
  }

  const mm = String(month).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

  const sql = getSQL();
  const services = await sql`
    SELECT date, amount, parts_cost FROM services
    WHERE date >= ${start} AND date <= ${end}
  `;
  const purchases = await sql`
    SELECT date, amount FROM purchases
    WHERE date >= ${start} AND date <= ${end}
  `;

  /** @type {Map<string, { sales: number, cost: number, count: number }>} */
  const map = new Map();
  const ensure = (date) => {
    if (!map.has(date)) map.set(date, { sales: 0, cost: 0, count: 0 });
    return map.get(date);
  };

  for (const s of services) {
    const d = ensure(s.date);
    d.sales += s.amount;
    d.cost += s.parts_cost || 0;
    d.count += 1;
  }
  for (const p of purchases) {
    const d = ensure(p.date);
    d.cost += p.amount;
  }

  const daily = {};
  let totalSales = 0;
  let totalCost = 0;
  for (const [date, { sales, cost, count } ] of map.entries()) {
    daily[date] = { sales, cost, profit: sales - cost, count };
    totalSales += sales;
    totalCost += cost;
  }

  const netProfit = totalSales - totalCost;
  const marginRate = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  return json({
    month: `${year}-${mm}`,
    daily,
    totals: {
      sales: totalSales,
      cost: totalCost,
      netProfit,
      marginRate: Math.round(marginRate * 10) / 10
    }
  });
}
