// ============================================================
//  Threads（脆）發文 — Meta 官方 Threads API，兩段式：建容器 -> 發布
// ============================================================

import { getThreadsToken } from './tokens.js';

const BASE = 'https://graph.threads.net/v1.0';

// text：貼文文字；imageUrl：選填，公開可存取的圖片網址
export async function publishThreads(env, text, imageUrl) {
  const uid = env.THREADS_USER_ID;
  const token = await getThreadsToken(env); // 優先用自動續期後的 token

  // Step 1：建立媒體容器
  const createParams = new URLSearchParams({ access_token: token });
  if (imageUrl) {
    createParams.set('media_type', 'IMAGE');
    createParams.set('image_url', imageUrl);
    createParams.set('text', text);
  } else {
    createParams.set('media_type', 'TEXT');
    createParams.set('text', text);
  }
  const createRes = await fetch(`${BASE}/${uid}/threads`, { method: 'POST', body: createParams });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    throw new Error(`Threads 建容器失敗：${JSON.stringify(createData)}`);
  }

  // Threads 建議在發布前稍等容器就緒；純文字通常即時，圖片可能需要幾秒。
  if (imageUrl) await sleep(3000);

  // Step 2：發布
  const pubParams = new URLSearchParams({ creation_id: createData.id, access_token: token });
  const pubRes = await fetch(`${BASE}/${uid}/threads_publish`, { method: 'POST', body: pubParams });
  const pubData = await pubRes.json();
  if (!pubRes.ok || !pubData.id) {
    throw new Error(`Threads 發布失敗：${JSON.stringify(pubData)}`);
  }
  return pubData.id; // 貼文 id
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
