// ============================================================
//  Facebook 粉專發文 — Graph API
//  純文字 -> /{page-id}/feed；有圖 -> /{page-id}/photos
// ============================================================

const BASE = 'https://graph.facebook.com/v21.0';

export async function publishFacebook(env, text, imageUrl) {
  const pageId = env.FB_PAGE_ID;
  const token = env.FB_PAGE_ACCESS_TOKEN;

  let url, params;
  if (imageUrl) {
    url = `${BASE}/${pageId}/photos`;
    params = new URLSearchParams({ url: imageUrl, caption: text, access_token: token });
  } else {
    url = `${BASE}/${pageId}/feed`;
    params = new URLSearchParams({ message: text, access_token: token });
  }

  const res = await fetch(url, { method: 'POST', body: params });
  const data = await res.json();
  if (!res.ok || !(data.id || data.post_id)) {
    throw new Error(`FB 發布失敗：${JSON.stringify(data)}`);
  }
  return data.post_id || data.id;
}
