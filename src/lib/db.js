import { openDB } from 'idb';

const DB_NAME = 'DoorlockDB';
const DB_VERSION = 1;

/** @type {import('idb').IDBPDatabase | null} */
let dbInstance = null;

/**
 * IndexedDB 초기화 및 인스턴스 반환
 * @returns {Promise<import('idb').IDBPDatabase>}
 */
export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 매출(서비스) 기록
      if (!db.objectStoreNames.contains('services')) {
        const serviceStore = db.createObjectStore('services', {
          keyPath: 'id',
          autoIncrement: true
        });
        serviceStore.createIndex('date', 'date');
        serviceStore.createIndex('paymentMethod', 'paymentMethod');
      }

      // 매입 기록
      if (!db.objectStoreNames.contains('purchases')) {
        const purchaseStore = db.createObjectStore('purchases', {
          keyPath: 'id',
          autoIncrement: true
        });
        purchaseStore.createIndex('date', 'date');
        purchaseStore.createIndex('supplier', 'supplier');
      }

      // 설정값
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });

  return dbInstance;
}

// ─── 매출(서비스) CRUD ───

/**
 * 매출 기록 저장
 * @param {{ date: string, time: string, paymentMethod: string, amount: number, partsCost: number, memo: string }} record
 * @returns {Promise<number>} 생성된 ID
 */
export async function addService(record) {
  const db = await getDB();
  return db.add('services', {
    ...record,
    createdAt: new Date().toISOString()
  });
}

/**
 * 매출 기록 수정
 * @param {object} record - id 포함된 전체 레코드
 */
export async function updateService(record) {
  const db = await getDB();
  return db.put('services', record);
}

/**
 * 매출 기록 삭제
 * @param {number} id
 */
export async function deleteService(id) {
  const db = await getDB();
  return db.delete('services', id);
}

/**
 * 특정 날짜의 매출 기록 조회
 * @param {string} date - 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
export async function getServicesByDate(date) {
  const db = await getDB();
  return db.getAllFromIndex('services', 'date', date);
}

/**
 * 기간별 매출 기록 조회
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array>}
 */
export async function getServicesByDateRange(startDate, endDate) {
  const db = await getDB();
  const range = IDBKeyRange.bound(startDate, endDate);
  return db.getAllFromIndex('services', 'date', range);
}

/**
 * 전체 매출 기록 조회
 * @returns {Promise<Array>}
 */
export async function getAllServices() {
  const db = await getDB();
  return db.getAll('services');
}

// ─── 매입 CRUD ───

/**
 * 매입 기록 저장
 * @param {{ date: string, supplier: string, amount: number, memo: string }} record
 * @returns {Promise<number>}
 */
export async function addPurchase(record) {
  const db = await getDB();
  return db.add('purchases', {
    ...record,
    createdAt: new Date().toISOString()
  });
}

/**
 * 매입 기록 수정
 * @param {object} record
 */
export async function updatePurchase(record) {
  const db = await getDB();
  return db.put('purchases', record);
}

/**
 * 매입 기록 삭제
 * @param {number} id
 */
export async function deletePurchase(id) {
  const db = await getDB();
  return db.delete('purchases', id);
}

/**
 * 기간별 매입 기록 조회
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Promise<Array>}
 */
export async function getPurchasesByDateRange(startDate, endDate) {
  const db = await getDB();
  const range = IDBKeyRange.bound(startDate, endDate);
  return db.getAllFromIndex('purchases', 'date', range);
}

/**
 * 전체 매입 기록 조회
 * @returns {Promise<Array>}
 */
export async function getAllPurchases() {
  const db = await getDB();
  return db.getAll('purchases');
}

/**
 * 매입처 목록 추출 (자동완성용, 중복 제거)
 * @returns {Promise<string[]>}
 */
export async function getSupplierList() {
  const db = await getDB();
  const all = await db.getAll('purchases');
  const set = new Set(all.map((p) => p.supplier));
  return [...set].sort();
}

// ─── 백업/복원 ───

/**
 * 전체 데이터 JSON으로 내보내기
 * @returns {Promise<object>}
 */
export async function exportAllData() {
  const db = await getDB();
  const services = await db.getAll('services');
  const purchases = await db.getAll('purchases');
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    services,
    purchases
  };
}

/**
 * JSON 데이터로 복원 (기존 데이터 덮어쓰기)
 * @param {object} data
 */
export async function importAllData(data) {
  const db = await getDB();

  // 기존 데이터 삭제
  const tx = db.transaction(['services', 'purchases'], 'readwrite');
  await tx.objectStore('services').clear();
  await tx.objectStore('purchases').clear();
  await tx.done;

  // 새 데이터 삽입
  const tx2 = db.transaction(['services', 'purchases'], 'readwrite');
  for (const s of data.services || []) {
    // id 제거 후 재삽입 (autoIncrement 충돌 방지)
    const { id, ...rest } = s;
    await tx2.objectStore('services').add(rest);
  }
  for (const p of data.purchases || []) {
    const { id, ...rest } = p;
    await tx2.objectStore('purchases').add(rest);
  }
  await tx2.done;
}

/**
 * 전체 데이터 삭제
 */
export async function clearAllData() {
  const db = await getDB();
  const tx = db.transaction(['services', 'purchases'], 'readwrite');
  await tx.objectStore('services').clear();
  await tx.objectStore('purchases').clear();
  await tx.done;
}
