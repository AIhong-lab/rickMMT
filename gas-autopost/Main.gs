// ===== 檔名：Main.gs =====
// v1 — LINE webhook 進入點（doPost）＋ 健康檢查（doGet）
// 部署為「網頁應用程式」後，網址填回 LINE Developers 的 Webhook URL。
// 改完程式碼記得「重新部署為新版本」才會生效。

function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  try {
    const json = JSON.parse(e.postData.contents);
    const events = json.events || [];
    const adminId = getConfig_('LINE_ADMIN_USER_ID');

    events.forEach(function (event) {
      const userId = event.source && event.source.userId;

      // 傳文字訊息 → 回你的 userId（設定 LINE_ADMIN_USER_ID 用）
      if (event.type === 'message' && event.message && event.message.type === 'text') {
        replyToLine_(event.replyToken,
          '你的 LINE userId 是：\n' + (userId || '(取不到)') +
          '\n\n把它填進指令碼屬性 LINE_ADMIN_USER_ID，草稿就會推到這裡。');
        return;
      }

      if (event.type !== 'postback') return;

      // 把關：只處理你本人的動作（GAS 無法驗簽章，改用 userId 比對）
      if (adminId && userId && userId !== adminId) {
        replyToLine_(event.replyToken, '這個操作僅限管理者。');
        return;
      }

      const p = parsePostback_(event.postback.data);
      const found = findById_(p.id);
      if (!found) { replyToLine_(event.replyToken, '這篇找不到了（可能已處理過）。'); return; }

      const status = found.data[COL.STATUS];
      if (status !== 'pending') {
        replyToLine_(event.replyToken, '這篇已經是「' + status + '」狀態，不用再動它。');
        return;
      }

      if (p.action === 'approve') {
        updateRow_(found.rowIndex, { status: 'approved', approvedAt: nowStr_() });
        replyToLine_(event.replyToken, '✅ 已核准，排入待發庫存，時間到會自動雙發。');
      } else if (p.action === 'reject') {
        updateRow_(found.rowIndex, { status: 'rejected' });
        replyToLine_(event.replyToken, '❌ 已退回。下次產文批次會重寫這類主題。');
      }
    });
  } catch (err) {
    Logger.log('doPost 錯誤：' + err);
  }

  // 無論成敗都回 200，避免 LINE 重送
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- 本檔函式清單 ----
// doGet / doPost
