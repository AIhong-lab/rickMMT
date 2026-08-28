// ===== 檔名：Publish.gs =====
// v1 — 發布層：Threads 兩段式 + Facebook 粉專，雙發容忍單邊失敗
//        以及 Threads 長效 token 自動續期
// ⚠️ 各端點與參數請對照 Threads / Facebook Graph API 官方文件確認

// ---- Threads token（優先用續期後的，沒有才用首次的 secret）----
function getThreadsToken_() {
  const live = PropertiesService.getScriptProperties().getProperty('THREADS_TOKEN_LIVE');
  return live || getConfig_('THREADS_ACCESS_TOKEN');
}

// 每週續期一次，續到的存回 THREADS_TOKEN_LIVE；失敗才通知你
function runTokenMaintenance() {
  try {
    const current = getThreadsToken_();
    const url = 'https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=' + encodeURIComponent(current);
    const res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    const data = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200 || !data.access_token) {
      throw new Error(res.getContentText());
    }
    PropertiesService.getScriptProperties().setProperty('THREADS_TOKEN_LIVE', data.access_token);
    Logger.log('Threads token 已續期，約 ' + Math.round((data.expires_in || 0) / 86400) + ' 天後再到期');
  } catch (err) {
    pushText_('🔑 Threads token 續期失敗，可能需要你手動重產長效 token。\n' + String(err).slice(0, 200));
  }
}

// ---- Threads 發文（兩段式：建容器 → 發布）----
function publishThreads_(text, imageUrl) {
  const uid = getConfig_('THREADS_USER_ID');
  const token = getThreadsToken_();
  const base = 'https://graph.threads.net/v1.0';

  // Step 1 建容器
  const createPayload = { access_token: token, text: text };
  if (imageUrl) { createPayload.media_type = 'IMAGE'; createPayload.image_url = imageUrl; }
  else { createPayload.media_type = 'TEXT'; }
  const createRes = UrlFetchApp.fetch(base + '/' + uid + '/threads', {
    method: 'post', payload: createPayload, muteHttpExceptions: true,
  });
  const createData = JSON.parse(createRes.getContentText());
  if (createRes.getResponseCode() !== 200 || !createData.id) {
    throw new Error('Threads 建容器失敗：' + createRes.getContentText());
  }

  if (imageUrl) Utilities.sleep(3000); // 圖片容器需要幾秒就緒

  // Step 2 發布
  const pubRes = UrlFetchApp.fetch(base + '/' + uid + '/threads_publish', {
    method: 'post', payload: { creation_id: createData.id, access_token: token }, muteHttpExceptions: true,
  });
  const pubData = JSON.parse(pubRes.getContentText());
  if (pubRes.getResponseCode() !== 200 || !pubData.id) {
    throw new Error('Threads 發布失敗：' + pubRes.getContentText());
  }
  return pubData.id;
}

// ---- Facebook 粉專發文 ----
function publishFacebook_(text, imageUrl) {
  const pageId = getConfig_('FB_PAGE_ID');
  const token = getConfig_('FB_PAGE_ACCESS_TOKEN');
  const base = 'https://graph.facebook.com/v21.0';

  let url, payload;
  if (imageUrl) {
    url = base + '/' + pageId + '/photos';
    payload = { url: imageUrl, caption: text, access_token: token };
  } else {
    url = base + '/' + pageId + '/feed';
    payload = { message: text, access_token: token };
  }
  const res = UrlFetchApp.fetch(url, { method: 'post', payload: payload, muteHttpExceptions: true });
  const data = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200 || !(data.id || data.post_id)) {
    throw new Error('FB 發布失敗：' + res.getContentText());
  }
  return data.post_id || data.id;
}

// ---- 雙發協調：一篇 post（來自 Sheet 的一列 data + rowIndex）----
function publishOne_(rowIndex, data) {
  const text = data[COL.CONTENT];
  const imageUrl = data[COL.IMAGE] || null;

  let thRes, fbRes;
  try { thRes = 'ok:' + publishThreads_(text, imageUrl); } catch (e) { thRes = 'err:' + String(e).slice(0, 150); }
  try { fbRes = 'ok:' + publishFacebook_(text, imageUrl); } catch (e) { fbRes = 'err:' + String(e).slice(0, 150); }

  const thOk = thRes.indexOf('ok:') === 0;
  const fbOk = fbRes.indexOf('ok:') === 0;
  const note = 'Threads ' + thRes + ' ｜ FB ' + fbRes;

  if (thOk || fbOk) {
    updateRow_(rowIndex, { status: 'published', publishedAt: nowStr_(), result: note });
    const flag = (thOk && fbOk) ? '✅ 雙平台都成功' : '⚠️ 有一邊失敗';
    pushText_(flag + '\nThreads：' + (thOk ? '成功' : '失敗') + '｜FB：' + (fbOk ? '成功' : '失敗') + '\n' + text.slice(0, 40) + '…');
    return true;
  }
  // 兩邊都失敗：留在庫存（維持 approved），下個時段自動重試
  updateRow_(rowIndex, { result: note });
  pushText_('❌ 發文兩邊都失敗，已保留待重試。\n' + note);
  return false;
}

// ---- 本檔函式清單 ----
// getThreadsToken_ / runTokenMaintenance / publishThreads_ / publishFacebook_ / publishOne_
