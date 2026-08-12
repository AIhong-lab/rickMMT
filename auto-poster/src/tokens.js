// ============================================================
//  憑證維護 — Threads 長效 token 自動續期
//  Threads 長效 token 約 60 天到期。每週跑一次續期，
//  續到的新 token 存進 D1 settings（優先於一開始的 secret）。
// ============================================================
import { pushText } from './line.js';

const KEY_THREADS_TOKEN = 'threads_access_token';

export async function getSetting(env, key) {
  const r = await env.DB.prepare(`SELECT value FROM settings WHERE key=?`).bind(key).first();
  return r?.value ?? null;
}

export async function setSetting(env, key, value) {
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
  ).bind(key, value, new Date().toISOString()).run();
}

// 目前有效的 Threads token：優先用 D1 續期後的，沒有才用 secret（首次啟動）
export async function getThreadsToken(env) {
  return (await getSetting(env, KEY_THREADS_TOKEN)) ?? env.THREADS_ACCESS_TOKEN;
}

// 呼叫 Threads 續期端點換新 token（token 需已存在超過 24 小時、且尚未過期）
export async function refreshThreadsToken(env) {
  const current = await getThreadsToken(env);
  const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${current}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Threads token 續期失敗：${JSON.stringify(data)}`);
  }
  await setSetting(env, KEY_THREADS_TOKEN, data.access_token);
  return data.expires_in; // 秒
}

// 每週維護：續期，失敗才吵你（成功保持安靜）
export async function runTokenMaintenance(env) {
  try {
    const expiresIn = await refreshThreadsToken(env);
    const days = Math.round(expiresIn / 86400);
    console.log(`Threads token 已續期，約 ${days} 天後再到期`);
  } catch (e) {
    console.error('token maintenance error', e);
    await pushText(env, `🔑 Threads token 續期失敗，可能需要你手動重新產一次長效 token。\n${String(e).slice(0, 200)}`);
  }
}
