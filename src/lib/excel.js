/**
 * 엑셀 내보내기 (SheetJS 사용)
 * 레퍼런스의 excel_export_service.dart를 JS로 변환
 */

/**
 * 서비스/매입 데이터를 엑셀로 내보내기
 * @param {Array} services - 매출 기록 배열
 * @param {Array} purchases - 매입 기록 배열
 * @param {string} startDate - 시작일 YYYY-MM-DD
 * @param {string} endDate - 종료일 YYYY-MM-DD
 */
export async function exportToExcel(services, purchases, startDate, endDate) {
  // SheetJS를 동적 로드 (번들 크기 절약)
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');

  const wb = XLSX.utils.book_new();

  // ─── 시트1: 건별 상세 ───
  const detailHeaders = ['날짜', '시간', '결제수단', '매출액', '부품비', '순수익', '메모'];
  const detailData = services
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    })
    .map((s) => [
      s.date,
      s.time || '',
      s.paymentMethod,
      s.amount,
      s.partsCost || 0,
      s.amount - (s.partsCost || 0),
      s.memo || ''
    ]);

  const ws1 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailData]);

  // 컬럼 너비 설정
  ws1['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 24 }
  ];

  XLSX.utils.book_append_sheet(wb, ws1, '건별상세');

  // ─── 시트2: 일별 요약 ───
  const dailyMap = new Map();

  for (const s of services) {
    if (!dailyMap.has(s.date)) {
      dailyMap.set(s.date, { count: 0, sales: 0, parts: 0, cash: 0, card: 0, transfer: 0, purchase: 0 });
    }
    const d = dailyMap.get(s.date);
    d.count += 1;
    d.sales += s.amount;
    d.parts += s.partsCost || 0;
    if (s.paymentMethod === '현금') d.cash += s.amount;
    else if (s.paymentMethod === '카드') d.card += s.amount;
    else if (s.paymentMethod === '계좌이체') d.transfer += s.amount;
  }

  for (const p of purchases) {
    if (!dailyMap.has(p.date)) {
      dailyMap.set(p.date, { count: 0, sales: 0, parts: 0, cash: 0, card: 0, transfer: 0, purchase: 0 });
    }
    dailyMap.get(p.date).purchase += p.amount;
  }

  const summaryHeaders = ['날짜', '건수', '총매출', '부품비', '현금', '카드', '계좌이체', '총매입', '순수익', '마진율(%)'];
  const summaryData = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const netProfit = d.sales - d.parts - d.purchase;
      const margin = d.sales > 0 ? ((netProfit / d.sales) * 100) : 0;
      return [date, d.count, d.sales, d.parts, d.cash, d.card, d.transfer, d.purchase, netProfit, Math.round(margin * 10) / 10];
    });

  const ws2 = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryData]);
  ws2['!cols'] = [
    { wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
  ];

  XLSX.utils.book_append_sheet(wb, ws2, '일별요약');

  // ─── 시트3: 매입 내역 ───
  if (purchases.length > 0) {
    const purchaseHeaders = ['날짜', '매입처', '금액', '메모'];
    const purchaseData = purchases
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => [p.date, p.supplier, p.amount, p.memo || '']);

    const ws3 = XLSX.utils.aoa_to_sheet([purchaseHeaders, ...purchaseData]);
    ws3['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 24 }];

    XLSX.utils.book_append_sheet(wb, ws3, '매입내역');
  }

  // 파일명 생성 및 다운로드
  const fileName = `도어락장부_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
