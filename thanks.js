/* ============================================================
   KUU SAUNA — thanks.js
   予約完了ページ。
   予約システムから ?date=&time=&plan= を渡せた場合だけ、
   予約内容を出す。渡せなくてもページは成立する。
   ============================================================ */
(function () {
  'use strict';

  var S = window.KUU_SCHEDULE || {};
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var qs = new URLSearchParams(location.search);

  var date = qs.get('date');                       // 2026-09-27
  var time = qs.get('time');                       // 10:00
  var plan = qs.get('plan');
  var qty = parseInt(qs.get('qty'), 10) || 0;
  var ref = qs.get('ref') || '';
  var restored = false;

  /* 控えを読み戻す。理由は2つ。
       ・決済ページを経由すると、戻り先URLに枠の情報が付かない
         （Stripe の遷移先は固定URLで、日時を差し込めない）
       ・メールを送らない運用では、この画面が唯一の控えになる。
         閉じてしまっても開き直せるようにしておく。
     利用が済んだ予約は、6時間後に消す。                        */
  if (!date || !time) {
    try {
      var kept = JSON.parse(localStorage.getItem('kuu.last') || 'null');
      if (kept && kept.date && kept.time && fresh(kept.date, kept.time)) {
        date = kept.date; time = kept.time;
        plan = plan || kept.plan;
        qty = qty || kept.qty || 0;
        ref = ref || kept.ref || '';
        restored = true;
      }
    } catch (e) { /* 読めなければ、枠なしのページとして成立させる */ }
  }

  /* 枠の終了から6時間が過ぎていないか。
     先の予約なら、何週間前に取ったものでも控えとして有効。 */
  function fresh(dk, tm) {
    var a = dk.split('-'), b = tm.split(':');
    var t = new Date(+a[0], +a[1] - 1, +a[2], +b[0], +b[1]);
    t.setMinutes(t.getMinutes() + (S.durationMin || 90) + 360);
    return t.getTime() > Date.now();
  }

  plan = plan === 'private' ? 'private' : 'standard';
  var planLabel = ((S.plans || {})[plan] || {}).label || '';

  /* 完了の計測。外部サイトを経由して戻るので、
     ここがこのサイト側で拾える唯一の「予約が済んだ」地点になる */
  (window.dataLayer = window.dataLayer || []).push({
    event: 'booking_complete',
    slot_date: date || '(不明)',
    slot_time: time || '(不明)',
    slot_plan: plan
  });

  /* ---- 文言を実態に合わせる ----------------------------------
     確認メールが本当に届くときだけ、そう書く。
     申し込みの送り先が未設定なら、何も送られていないので
     「この画面が控えです」に切り替える。                        */
  (function () {
    var lead = document.getElementById('txLead');
    if (!lead) return;
    var keep = document.getElementById('txKeep');

    var pay = S.payment || {}, byQty = (pay.urlByQty || {}).standard || {};
    var paying = !!(pay.url || (pay.urlByPlan || {}).standard ||
                    (pay.urlByPlan || {}).private ||
                    byQty[1] || byQty[2] || byQty[3] || byQty[4]);
    var posting = !!S.formEndpoint;

    if (posting && S.confirmEmail) {
      /* 枠の日時が入った確認メールが、お客さまに届く */
      lead.innerHTML = '確認メールをお送りしました。<br>' +
        '届いていない場合は、迷惑メールフォルダをご確認ください。';
    } else if (paying && S.confirmEmail) {
      /* 届くのは決済の領収書。日時は載らないので、そう書かない */
      lead.innerHTML = 'お支払いが完了しました。<br>' +
        '<span class="s">領収書は決済会社からメールで届きます。' +
        'ご予約の日時は、この画面でご確認ください。</span>';
      if (keep) keep.hidden = false;
    } else if (paying) {
      /* 決済はしたが、確認メールは送らない運用 */
      lead.innerHTML = 'ご予約を承りました。<br>' +
        '<span class="s">この画面が控えです。領収書は決済会社からメールで届きます。' +
        '念のため、下の受付番号をお控えください。</span>';
      if (keep) keep.hidden = false;
    } else {
      /* メールを一切使わない運用。待たせないよう、送らないと明言する */
      lead.innerHTML = 'ご予約を承りました。<br>' +
        '<span class="s">確認メールはお送りしません。この画面が控えですので、' +
        '下の受付番号をお控えください。</span>';
      if (keep) keep.hidden = false;
    }
  })();

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !/^\d{1,2}:\d{2}$/.test(time)) return;

  var p = date.split('-');
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  if (isNaN(d.getTime())) return;

  var t = time.split(':');
  var startMin = (+t[0]) * 60 + (+t[1]);
  var endMin = startMin + (S.durationMin || 90);
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var endTime = pad(Math.floor(endMin / 60) % 24) + ':' + pad(endMin % 60);

  var box = document.getElementById('txSlot');
  document.getElementById('txWhen').textContent =
    (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '）　' + time + ' – ' + endTime;
  document.getElementById('txPlan').textContent =
    planLabel + (plan === 'private' ? '（貸切）' : '');
  box.hidden = false;

  /* 人数と受付番号。お問い合わせのとき、これで照合する */
  var meta = document.getElementById('txMeta');
  if (meta && (qty || ref)) {
    meta.innerHTML =
      (qty ? '<span>ご利用人数　' + qty + '名</span>' : '') +
      (ref ? '<span>受付番号　<b>' + ref.replace(/[^0-9a-z-]/gi, '') + '</b></span>' : '');
    meta.hidden = false;
  }

  /* 決済から戻ったときはURLに枠が入っていない。
     控えとして残せるよう、ブックマークできるURLに書き換える。 */
  if (restored && history.replaceState) {
    try {
      history.replaceState(null, '', 'thanks.html?date=' + date +
        '&time=' + encodeURIComponent(time) + '&plan=' + plan +
        (qty ? '&qty=' + qty : '') + (ref ? '&ref=' + encodeURIComponent(ref) : ''));
    } catch (e) { /* 書き換えられなくても表示は変わらない */ }
  }

})();
