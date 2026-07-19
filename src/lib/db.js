/**
 * 도어락 장부 — 데이터 서비스 (Vercel Postgres)
 *
 * 함수 시그니처는 기존 IndexedDB 버전과 동일.
 * 내부적으로 서버 API를 호출하여 Postgres에 읽기/쓰기.
 */

// ─── 매출(서비스) ───

/** 특정 날짜의 매출 조회 */
export async function getServicesByDate(date) {
  const res = await fetch(`/api/services?date=${date}`);
  return res.json();
}

/** 기간별 매출 조회 */
export async function getServicesByDateRange(start, end) {
  const res = await fetch(`/api/services?start=${start}&end=${end}`);
  return res.json();
}

/** 매출 추가 */
export async function addService(data) {
  const res = await fetch('/api/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

/** 매출 수정 */
export async function updateService(data) {
  const res = await fetch(`/api/services/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

/** 매출 삭제 */
export async function deleteService(id) {
  const res = await fetch(`/api/services/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

// ─── 매입 ───

/** 전체 매입 조회 */
export async function getAllPurchases() {
  const res = await fetch('/api/purchases');
  return res.json();
}

/** 기간별 매입 조회 */
export async function getPurchasesByDateRange(start, end) {
  const res = await fetch(`/api/purchases?start=${start}&end=${end}`);
  return res.json();
}

/** 매입 추가 */
export async function addPurchase(data) {
  const res = await fetch('/api/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

/** 매입 수정 */
export async function updatePurchase(data) {
  const res = await fetch(`/api/purchases/${data.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

/** 매입 삭제 */
export async function deletePurchase(id) {
  const res = await fetch(`/api/purchases/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

/** 매입처 목록 조회 */
export async function getSupplierList() {
  const res = await fetch('/api/purchases?suppliers');
  return res.json();
}

// ─── 매입처 관리 (카테고리/병합) ───

/** 매입처 목록 조회 (카테고리 + 매입 건수/합계 포함) */
export async function getSuppliers() {
  const res = await fetch('/api/suppliers');
  return res.json();
}

/** 매입처 수동 등록 */
export async function addSupplier(data) {
  const res = await fetch('/api/suppliers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

/** 매입처 이름/카테고리 수정 (이름이 기존 매입처와 겹치면 병합) */
export async function updateSupplier(id, data) {
  const res = await fetch(`/api/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

/** 매입처 삭제 (매입 이력이 없는 경우만 가능) */
export async function deleteSupplier(id) {
  const res = await fetch(`/api/suppliers/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

// ─── 백업/복원 ───

/** 전체 데이터 백업 (JSON) */
export async function exportAllData() {
  const res = await fetch('/api/data');
  return res.json();
}

/** 데이터 복원 */
export async function importAllData(data) {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

/** 전체 데이터 삭제 */
export async function clearAllData() {
  const res = await fetch('/api/data', {
    method: 'DELETE'
  });
  return res.json();
}
