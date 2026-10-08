/* ============================================================
   KUU SAUNA — booking.js
   お申し込み内容の入力と確認。

   ★ このページでカード番号は一切扱わない。
     入力が済んだら、決済事業者のページへ送る。
     静的サイトでカード番号を受け取る手段は無く、
     受け取ろうとすれば平文でURLやブラウザに残ってしまう。
   ============================================================ */
(function () {
  'use strict';

  var S = window.KUU_SCHEDULE, K = window.KUU;
  if (!S || !K) return;

  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var qs = new URLSearchParams(location.search);
  var date = qs.get('date');
  var time = qs.get('time');
  var plan = qs.get('plan') === 'private' ? 'private' : 'standard';

  var noSlot = document.getElementById('bkNoSlot');
  var main = document.getElementById('bkMain');

  /* ---- 枠の妥当性を確かめる ---- */
  var day = null, slot = null;
  if (date && time) {
    K.buildDays().forEach(function (d) {
      if (d.key !== date || d.closed) return;
      d.slots.forEach(function (s) {
        if (s.time === time && K.bookable(s, plan)) { day = d; slot = s; }
      });
    });
  }

  if (!day || !slot) {
    noSlot.hidden = false;
    document.getElementById('bkTitle').innerHTML =
      'この枠はお選びいただけません。<span class="h2__en">Slot unavailable</span>';
    return;
  }
  main.hidden = false;

  var P = S.plans[plan];
  document.getElementById('bkWhen').textContent =
    (day.date.getMonth() + 1) + '月' + day.date.getDate() + '日（' + day.weekday + '）　' +
    slot.time + ' – ' + slot.end;
  document.getElementById('bkPlan').textContent = P.label + (plan === 'private' ? '（貸切）' : '');
  document.getElementById('bkChange').href = 'reserve.html?date=' + day.key + '&plan=' + plan;

  /* ---- 人数の選択肢。STANDARDは残り人数まで ---- */
  var maxQty = plan === 'private' ? S.capacity : slot.left;
  var sel = document.getElementById('qty');
  for (var i = 1; i <= maxQty; i++) {
    var o = document.createElement('option');
    o.value = i; o.textContent = i + '名';
    sel.appendChild(o);
  }
  document.getElementById('qtyHelp').textContent = plan === 'private'
    ? '貸切なので、1〜' + S.capacity + '名まで料金は変わりません。'
    : 'この枠の残りは' + slot.left + '名です。';

  /* ---- 合計金額 ---- */
  function total() {
    var n = +sel.value || 1;
    return plan === 'private' ? P.price : P.price * n;
  }
  function yen(v) { return '¥' + v.toLocaleString(); }

  function paintTotal() {
    var n = +sel.value || 1;
    document.getElementById('totalUnit').textContent =
      plan === 'private' ? '貸切 1枠' : P.label + '　' + yen(P.price) + ' × ' + n + '名';
    document.getElementById('totalCalc').textContent = plan === 'private' ? '1〜4名' : n + '名';
    document.getElementById('totalYen').textContent = yen(total());
    document.getElementById('totalYen2').textContent = yen(total());
  }
  sel.addEventListener('change', paintTotal);
  paintTotal();

  /* ---- 入力チェック ---- */
  var form = document.getElementById('bkForm');
  var okEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
  var okTel = function (v) { return (v.replace(/[^0-9]/g, '').length >= 10); };

  function setErr(el, bad) {
    var fld = el.closest('.fld');
    var e = fld.querySelector('.fld__e');
    fld.classList.toggle('has-err', bad);
    if (e) e.hidden = !bad;
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return !bad;
  }

  function validate() {
    var name = document.getElementById('name');
    var email = document.getElementById('email');
    var tel = document.getElementById('tel');
    var agree = document.getElementById('agree');
    var ok = true;
    ok = setErr(name, !name.value.trim()) && ok;
    ok = setErr(email, !okEmail(email.value.trim())) && ok;
    ok = setErr(tel, !okTel(tel.value)) && ok;
    ok = setErr(agree, !agree.checked) && ok;
    return ok;
  }

  ['name', 'email', 'tel', 'agree'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () {
      if (el.closest('.fld').classList.contains('has-err')) validate();
    });
  });

  /* ---- 入力 → 確認 ---- */
  function values() {
    var g = function (id) { return (document.getElementById(id).value || '').trim(); };
    var f = document.querySelector('input[name="first"]:checked');
    return {
      qty: +sel.value || 1, name: g('name'), kana: g('kana'),
      email: g('email'), tel: g('tel'),
      first: f ? f.value : '', note: g('note')
    };
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      var bad = form.querySelector('.has-err');
      if (bad) { bad.scrollIntoView({ block: 'center' }); var i = bad.querySelector('input,select'); if (i) i.focus(); }
      return;
    }
    var v = values();

    var rows = [
      ['ご利用人数', v.qty + '名'],
      ['お名前', v.name + (v.kana ? '（' + v.kana + '）' : '')],
      ['メールアドレス', v.email],
      ['電話番号', v.tel],
      ['サウナのご利用', v.first],
      ['ご要望', v.note || 'なし']
    ];
    document.getElementById('bkReview').innerHTML = rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd>' + String(r[1]).replace(/[<>&]/g, '') + '</dd></div>';
    }).join('');

    buildPayLink(v);

    form.hidden = true;
    document.getElementById('bkConfirm').hidden = false;
    document.getElementById('stepEnter').classList.replace('is-now', 'is-done');
    document.getElementById('stepPay').classList.add('is-now');
    document.getElementById('bkTitle').innerHTML =
      'この内容でよろしいですか。<span class="h2__en">Please confirm</span>';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    (window.dataLayer = window.dataLayer || []).push({
      event: 'booking_details', slot_date: day.key, slot_time: slot.time,
      slot_plan: plan, party_size: v.qty, value: total(), currency: 'JPY'
    });
  });

  document.getElementById('bkBack').addEventListener('click', function () {
    document.getElementById('bkConfirm').hidden = true;
    form.hidden = false;
    document.getElementById('stepPay').classList.remove('is-now');
    document.getElementById('stepEnter').classList.replace('is-done', 'is-now');
    document.getElementById('bkTitle').innerHTML =
      'お申し込み内容。<span class="h2__en">Your details</span>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---- 申し込みの行き先 ------------------------------------
     1) 決済URLあり      → 決済ページへ（決済側が thanks.html に戻す）
        送信先も設定されていれば、送ってから決済ページへ
     2) 送信先あり        → 内容を送ってから thanks.html へ
     3) どちらも無く、サンプル表示中 → そのまま thanks.html（動作確認用）
     4) どちらも無く、本番表示       → メールで受ける
        （公開中に申し込みを取りこぼさないため。
          何も送らずに完了画面を出すと、予約できていないのに
          予約できたと誤解させてしまう）
     ------------------------------------------------------------ */
  function thanksUrl(qty, ref) {
    return 'thanks.html?date=' + day.key +
           '&time=' + encodeURIComponent(slot.time) + '&plan=' + plan +
           (qty ? '&qty=' + qty : '') +
           (ref ? '&ref=' + encodeURIComponent(ref) : '');
  }

  /* 決済ページを経由すると、戻り先URLに枠の情報を付けられない。
     （Stripe の遷移先は固定URLで、日時を差し込めない）
     移動する直前にブラウザへ控えておき、完了ページで読み戻す。 */
  function keepSlot(qty, ref) {
    try {
      localStorage.setItem('kuu.last', JSON.stringify({
        date: day.key, time: slot.time, plan: plan, qty: qty, ref: ref, at: Date.now()
      }));
    } catch (e) { /* プライベートモードなどで使えなくても進める */ }
  }

  /* 人数別 → プラン別 → 共通 の順に決済URLを決める */
  function payUrlFor(qty) {
    var pay = S.payment || {};
    var byQty = (pay.urlByQty || {})[plan] || {};
    return byQty[qty] || (pay.urlByPlan || {})[plan] || pay.url || '';
  }

  function buildPayLink(v) {
    var pay = S.payment || {};
    var payUrl = payUrlFor(v.qty);
    var post = S.formEndpoint || '';
    var note = document.getElementById('payNote');

    /* 「内容を変える」で戻ってから再送信すると、ここが二度目になる。
       前回のクリック処理が残っていると二重送信になるので、
       ボタンを作り直して、付いている処理をいったん落とす。      */
    var old = document.getElementById('bkPay');
    var go = old.cloneNode(true);
    go.removeAttribute('target'); go.removeAttribute('rel');
    go.classList.remove('is-sending');
    old.parentNode.replaceChild(go, old);
    var ref = day.key.replace(/-/g, '') + '-' + slot.time.replace(':', '') + '-' + plan + '-' + v.qty;

    var fields = {
      枠: day.key + '（' + day.weekday + '）' + slot.time + '–' + slot.end,
      プラン: P.label, 人数: v.qty + '名',
      お名前: v.name + (v.kana ? '（' + v.kana + '）' : ''),
      メールアドレス: v.email, 電話番号: v.tel,
      サウナのご利用: v.first, ご要望: v.note || 'なし',
      合計: yen(total()), 受付番号: ref
    };

    function track(where) {
      (window.dataLayer = window.dataLayer || []).push({
        event: 'cta_click', cta_location: where, cta_text: ref
      });
    }

    /* 申し込み内容を送信サービスへ送る。設定が無ければ素通り */
    function send() {
      if (!post) return Promise.resolve();
      var fd = new FormData();
      Object.keys(fields).forEach(function (k) { fd.append(k, fields[k]); });
      fd.append('_subject', 'KUU SAUNA ご予約 ' + ref);
      // 送信先サービスの自動返信が、お客さま宛てに返るようにする
      fd.append('_replyto', v.email);
      fd.append('email', v.email);
      return fetch(post, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('送信に失敗しました'); });
    }

    function failed(label) {
      go.classList.remove('is-sending');
      go.textContent = label;
      note.innerHTML = '<strong>送信できませんでした。</strong><br>' +
        '<span class="s">通信の状況をご確認のうえ、もう一度お試しください。' +
        '繰り返す場合は <a href="mailto:' + S.contactEmail + '">' + S.contactEmail +
        '</a> までご連絡ください。</span>';
    }

    /* 0) FormSubmit（無料で自動返信まで届く）-------------------
       この会社の自動返信は、fetch での送信では動かない。
       reCAPTCHA も有効のままにしておく必要がある。
       そのためここだけ、ふつうのフォーム送信にする。
       送信後は _next で指定した先へ戻ってくる。                */
    if (/(^|\/\/|\.)formsubmit\.co\//i.test(post)) {
      var abs = function (u) { return new URL(u, location.href).href; };
      var next = payUrl
        ? payUrl.replace(/\{(email|name|qty|date|time|end|plan|planLabel|total|ref)\}/g,
            function (m) {
              var mm = {
                '{email}': v.email, '{name}': v.name, '{qty}': v.qty,
                '{date}': day.key, '{time}': slot.time, '{end}': slot.end,
                '{plan}': plan, '{planLabel}': P.label,
                '{total}': total(), '{ref}': ref
              };
              return encodeURIComponent(mm[m]);
            })
        : abs(thanksUrl(v.qty, ref));

      go.href = payUrl ? '#pay' : thanksUrl(v.qty, ref);
      go.textContent = payUrl ? 'お支払いに進む' : 'この内容で申し込む';
      note.innerHTML = (payUrl
        ? 'このあと確認画面をはさんで、決済ページに移動します。<br>'
        : 'このあと確認画面をはさんで、完了画面に移ります。<br>') +
        '<span class="s">「私はロボットではありません」が表示されたら、' +
        'チェックして先にお進みください。' +
        (S.confirmEmail ? 'お申し込みの控えは、ご入力のアドレスにお送りします。' : '') +
        '</span>';

      go.addEventListener('click', function (e) {
        e.preventDefault();
        if (go.classList.contains('is-sending')) return;
        go.classList.add('is-sending');
        go.textContent = '送信しています…';
        keepSlot(v.qty, ref);
        track(payUrl ? 'go_payment' : 'submit_form');

        var f = document.createElement('form');
        f.method = 'POST';
        f.action = post;
        f.hidden = true;
        var add = function (k, val) {
          var i = document.createElement('input');
          i.type = 'hidden'; i.name = k; i.value = val;
          f.appendChild(i);
        };
        Object.keys(fields).forEach(function (k) { add(k, fields[k]); });
        add('email', v.email);                 // 自動返信の宛先になる
        add('_subject', 'KUU SAUNA ご予約 ' + ref);
        add('_template', 'table');
        add('_next', next);
        if (S.confirmEmail && S.autoResponse) add('_autoresponse', S.autoResponse);
        // ★ _captcha は false にしないこと。切ると自動返信が止まる。
        document.body.appendChild(f);
        f.submit();
      });
      return;
    }

    /* 1) 決済ページへ */
    if (payUrl) {
      var map = {
        '{email}': v.email, '{name}': v.name, '{qty}': v.qty,
        '{date}': day.key, '{time}': slot.time, '{end}': slot.end,
        '{plan}': plan, '{planLabel}': P.label,
        '{total}': total(), '{ref}': ref
      };
      var href = payUrl.replace(/\{(email|name|qty|date|time|end|plan|planLabel|total|ref)\}/g,
        function (m) { return encodeURIComponent(map[m]); });
      go.href = href;
      if (pay.newTab) { go.target = '_blank'; go.rel = 'noopener'; }
      go.textContent = 'お支払いに進む';
      note.innerHTML = 'このあと決済ページに移動します。<br>' +
        '<span class="s">カード情報は決済会社のページでご入力いただきます。当店では保持しません。' +
        (post && S.confirmEmail ? 'お申し込みの控えは、ご入力のアドレスにお送りします。' : '') +
        '</span>';

      go.addEventListener('click', function (e) {
        keepSlot(v.qty, ref);
        if (!post) { track('go_payment'); return; }   // そのまま決済ページへ
        e.preventDefault();
        if (go.classList.contains('is-sending')) return;
        go.classList.add('is-sending');
        go.textContent = '送信しています…';
        send()
          .then(function () { track('go_payment'); location.href = href; })
          .catch(function () { failed('お支払いに進む'); });
      });
      return;
    }

    /* 2) 送信先へ送ってから完了ページ */
    if (post) {
      go.href = thanksUrl(v.qty, ref);
      go.textContent = 'この内容で申し込む';
      note.innerHTML = 'お支払いは、折り返しお送りするメールでご案内します。<br>' +
        '<span class="s">カード情報をこのサイトに入力していただくことはありません。' +
        (S.confirmEmail ? 'お申し込みの控えも、同じアドレスにお送りします。' : '') +
        '</span>';

      go.addEventListener('click', function (e) {
        e.preventDefault();
        if (go.classList.contains('is-sending')) return;
        go.classList.add('is-sending');
        go.textContent = '送信しています…';
        keepSlot(v.qty, ref);
        send()
          .then(function () { track('submit_form'); location.href = thanksUrl(v.qty, ref); })
          .catch(function () { failed('この内容で申し込む'); });
      });
      return;
    }

    /* 3) 動作確認中（slots.js の sample が true） */
    if (K.isSample()) {
      go.href = thanksUrl(v.qty, ref);
      go.textContent = 'この内容で申し込む';
      note.innerHTML = '<strong>動作確認用の表示です。</strong><br>' +
        '<span class="s">実際には申し込みは送られません。公開前に slots.js の ' +
        'payment.url か formEndpoint を設定してください。</span>';
      go.addEventListener('click', function () { keepSlot(v.qty, ref); track('submit_demo'); }, { once: true });
      return;
    }

    /* 4) 本番で、まだ送信先が無いとき */
    var sub = 'KUU SAUNA ご予約 ' + day.key + ' ' + slot.time + ' ' + P.label;
    var body = Object.keys(fields).map(function (k) { return k + '：' + fields[k]; })
      .concat(['', '※ 折り返し、お支払いのご案内をお送りします。', '']).join('\n');
    go.href = 'mailto:' + S.contactEmail +
      '?subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
    go.textContent = 'メールで申し込む';
    note.innerHTML = '<strong>オンラインでの受付は準備中です。</strong><br>' +
      '<span class="s">ボタンを押すとメールが立ち上がります。そのまま送信してください。' +
      '折り返しお支払いのご案内をお送りします。</span>';
    go.addEventListener('click', function () { track('go_payment_email'); }, { once: true });
  }
})();
