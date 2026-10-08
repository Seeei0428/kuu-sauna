/* ============================================================
   KUU SAUNA — reserve.js
   空き枠ページ。日付の計算は schedule.js に任せる。
   URLの ?plan= と ?date= を受け取るので、LPから枠を指定して来られる。
   ============================================================ */
(function () {
  'use strict';

  var K = window.KUU, S = window.KUU_SCHEDULE;
  var elDates = document.getElementById('dates');
  var elSlots = document.getElementById('slots');
  if (!K || !S || !elDates || !elSlots) return;

  var days = K.buildDays();
  var plan = 'standard';
  var picked = null;

  /* ---- URLから受け取る ---- */
  var qs = new URLSearchParams(location.search);
  if (qs.get('plan') === 'private') plan = 'private';
  var wantDate = qs.get('date');
  var wantTime = qs.get('time');

  function push(o) { (window.dataLayer = window.dataLayer || []).push(o); }

  /* ---- 日付の並び ---- */
  function renderDates(sel) {
    elDates.innerHTML = '';
    days.forEach(function (d, i) {
      var open = !d.closed && d.slots.some(function (s) { return K.bookable(s, plan); });
      var over = !d.closed && !d.slots.some(function (s) { return !s.past; });
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'rv__date' + (i === sel ? ' is-on' : '') +
                    (d.closed ? ' is-closed' : '') + (!open && !d.closed ? ' is-full' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      b.innerHTML =
        '<span class="rv__date-m">' + (d.date.getMonth() + 1) + '月</span>' +
        '<span class="rv__date-d">' + d.date.getDate() + '</span>' +
        '<span class="rv__date-w">' + (d.isToday ? '本日' : d.weekday) + '</span>' +
        '<span class="rv__date-s">' + (d.closed ? '定休' : (over ? '終了' : (open ? '空き' : '満席'))) + '</span>';
      b.addEventListener('click', function () { render(i); });
      elDates.appendChild(b);
    });
    var on = elDates.children[sel];
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  /* ---- 枠の一覧 ---- */
  function renderSlots(sel) {
    var d = days[sel];
    var html = '<h2 class="rv__day">' +
      (d.date.getMonth() + 1) + '月' + d.date.getDate() + '日（' + d.weekday + '）</h2>';

    if (d.closed) {
      html += '<p class="rv__empty">定休日です。</p>';
    } else if (!d.slots.some(function (s) { return !s.past; })) {
      html += '<p class="rv__empty">本日の受付は終了しました。</p>';
    } else {
      html += '<ul class="rv__list">';
      d.slots.forEach(function (s, i) {
        var st = K.statusOf(s, plan);
        var ok = K.bookable(s, plan);
        html += '<li class="rv__slot ' + st.cls + '">' +
          '<span class="rv__time">' + s.time + '<i>– ' + s.end + '</i></span>' +
          '<span class="rv__status">' + st.text + '</span>' +
          (ok ? '<button type="button" class="rv__pick" data-i="' + i + '">選ぶ</button>'
              : '<span class="rv__pick rv__pick--off" aria-hidden="true">—</span>') +
          '</li>';
      });
      html += '</ul>';
      if (plan === 'private' && !d.slots.some(function (s) { return K.bookable(s, plan); })) {
        html += '<p class="rv__empty">この日は、貸切にできる枠が残っていません。</p>';
      }
    }
    elSlots.innerHTML = html;

    Array.prototype.forEach.call(elSlots.querySelectorAll('.rv__pick[data-i]'), function (btn) {
      btn.addEventListener('click', function () { pick(sel, +btn.getAttribute('data-i')); });
    });
  }

  /* ---- 選んだ枠 ---- */
  function pick(di, si) {
    var d = days[di], s = d.slots[si];
    picked = { day: d, slot: s };

    var bar = document.getElementById('pick');
    var p = S.plans[plan];
    document.getElementById('pickText').innerHTML =
      '<span>' + p.label + '　' + d.label + ' ' + s.time + '–' + s.end + '</span>' +
      p.price.toLocaleString() + p.unit;

    /* 行き先は2通り。
       外部の予約システムを使うなら slots.js の booking.url へ。
       使わないなら、自前の入力ページ booking.html へ。
       どちらの場合も、カード情報はこのサイトでは扱わない。 */
    var go = document.getElementById('pickGo');
    var ext = (S.booking && (S.booking.urlByPlan || {})[plan]) || (S.booking && S.booking.url) || '';

    if (ext) {
      var map = {
        '{date}': d.key, '{ymd}': d.key.replace(/-/g, ''),
        '{time}': s.time, '{end}': s.end,
        '{plan}': plan, '{planLabel}': p.label
      };
      go.href = ext.replace(/\{(date|ymd|time|end|plan|planLabel)\}/g, function (m) {
        return encodeURIComponent(map[m]);
      });
      if (S.booking.newTab) { go.target = '_blank'; go.rel = 'noopener'; }
      else { go.removeAttribute('target'); go.removeAttribute('rel'); }
    } else {
      go.href = 'booking.html?date=' + d.key +
                '&time=' + encodeURIComponent(s.time) + '&plan=' + plan;
      go.removeAttribute('target'); go.removeAttribute('rel');
    }

    bar.hidden = false;
    requestAnimationFrame(function () { bar.classList.add('is-on'); });

    Array.prototype.forEach.call(elSlots.querySelectorAll('.rv__slot'), function (li, i) {
      li.classList.toggle('is-picked', i === si);
    });

    push({ event: 'slot_select', slot_date: d.key, slot_time: s.time, slot_plan: plan });
  }

  function render(sel) {
    picked = null;
    var bar = document.getElementById('pick');
    bar.classList.remove('is-on'); bar.hidden = true;
    renderDates(sel);
    renderSlots(sel);
  }

  /* ---- プランの切り替え ---- */
  function setPlan(next, fromClick) {
    plan = next;
    Array.prototype.forEach.call(document.querySelectorAll('.rv__plan'), function (b) {
      var on = b.getAttribute('data-plan') === plan;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (fromClick) push({ event: 'plan_switch', plan_name: plan });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.rv__plan'), function (btn) {
    btn.addEventListener('click', function () {
      var sel = 0;
      Array.prototype.forEach.call(elDates.children, function (c, i) {
        if (c.classList.contains('is-on')) sel = i;
      });
      setPlan(btn.getAttribute('data-plan'), true);
      render(sel);
    });
  });

  document.getElementById('pickGo').addEventListener('click', function () {
    if (!picked) return;
    push({ event: 'cta_click', cta_location: 'slot_confirm',
           cta_text: picked.day.key + ' ' + picked.slot.time + ' ' + plan });
  });

  /* ---- 初期表示 ---- */
  if (K.isSample()) {
    var n = document.getElementById('sampleNote');
    if (n) n.hidden = false;
  }
  setPlan(plan, false);

  // 最初に開く日。URLで指定があればそこ、なければ直近の空き
  var first = -1;
  if (wantDate) {
    for (var i = 0; i < days.length; i++) { if (days[i].key === wantDate) { first = i; break; } }
  }
  if (first < 0) {
    first = 0;
    for (var j = 0; j < days.length; j++) {
      if (!days[j].closed && days[j].slots.some(function (s) { return K.bookable(s, plan); })) { first = j; break; }
    }
  }
  render(first);

  // 時刻の指定もあれば、その枠を選んだ状態で開く
  if (wantTime) {
    var si = -1;
    days[first].slots.forEach(function (s, i) {
      if (s.time === wantTime && K.bookable(s, plan)) si = i;
    });
    if (si >= 0) pick(first, si);
  }

  var u = document.getElementById('updated');
  if (u) {
    u.textContent = K.isSample()
      ? '※ サンプル表示中です。'
      : '空き状況は予約が入りしだい更新しています。行き違いが起きた場合はご連絡します。';
  }
})();
