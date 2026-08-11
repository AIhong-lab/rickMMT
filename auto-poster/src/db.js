// ============================================================
//  內容池的資料庫操作（Cloudflare D1）
// ============================================================
import { twDateStr } from './config.js';

function randId() {
  // Workers 有全域 crypto
  return crypto.randomUUID().slice(0, 12);
}

// 存入一篇自檢過關的草稿，狀態 = pending（待你在 LINE 審核）
export async function insertPending(env, { pillar, content, imageUrl, fire, neutral, eyeroll }) {
  const id = randId();
  await env.DB.prepare(
    `INSERT INTO posts (id, pillar, content, image_url, fire, neutral, eyeroll, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, pillar, content, imageUrl ?? null, fire, neutral, eyeroll, new Date().toISOString())
   .run();
  return id;
}

export async function getPost(env, id) {
  return env.DB.prepare(`SELECT * FROM posts WHERE id = ?`).bind(id).first();
}

// 核准：pending -> approved（進入待發庫存）
export async function approve(env, id) {
  const r = await env.DB.prepare(
    `UPDATE posts SET status='approved', approved_at=? WHERE id=? AND status='pending'`
  ).bind(new Date().toISOString(), id).run();
  return r.meta.changes > 0;
}

// 退回：pending -> rejected（會觸發重產）
export async function reject(env, id) {
  const r = await env.DB.prepare(
    `UPDATE posts SET status='rejected' WHERE id=? AND status='pending'`
  ).bind(id).run();
  return r.meta.changes > 0;
}

// 取出待發庫存裡最舊的一篇（FIFO），準備發布
export async function nextApproved(env) {
  return env.DB.prepare(
    `SELECT * FROM posts WHERE status='approved' ORDER BY approved_at ASC LIMIT 1`
  ).first();
}

// 標記已發布
export async function markPublished(env, id, note) {
  await env.DB.prepare(
    `UPDATE posts SET status='published', published_at=?, publish_note=? WHERE id=?`
  ).bind(new Date().toISOString(), note, id).run();
}

// 標記發布失敗（保留在庫存，下個時段可重試）
export async function markFailed(env, id, note) {
  await env.DB.prepare(
    `UPDATE posts SET status='approved', publish_note=? WHERE id=?`
  ).bind(note, id).run();
}

// 待發庫存數（給補稿提醒用）
export async function countApproved(env) {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM posts WHERE status='approved'`
  ).first();
  return r?.n ?? 0;
}

// 台灣「今天」已經發了幾篇（給每日上限用）
export async function countPublishedToday(env) {
  const today = twDateStr();
  // published_at 是 UTC ISO；換算成 TW 日期比對
  const rows = await env.DB.prepare(
    `SELECT published_at FROM posts WHERE status='published' AND published_at IS NOT NULL`
  ).all();
  let n = 0;
  for (const row of rows.results ?? []) {
    const tw = new Date(new Date(row.published_at).getTime() + 8 * 3600 * 1000)
      .toISOString().slice(0, 10);
    if (tw === today) n++;
  }
  return n;
}
