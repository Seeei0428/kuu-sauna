/* ============================================================
   KUU SAUNA — schedule.js
   slots.js のデータから、日ごとの枠を組み立てる。
   LP（index.html）と空き枠ページ（reserve.html）の両方が使う。
   ここが 1 つなので、2ページで空き状況が食い違うことはない。
   ============================================================ */
window.KUU = (function () {
  'use strict';

  var S = window.KUU_SCHEDULE || null;
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var key = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var label = function (d) { return (d.getMonth() + 1) + '/' + d.getDate() + '（' + WD[d.getDay()] + '）'; };

  /* 開始時刻に滞在時間を足して終了時刻にする */
  function endTime(t) {
    var p = t.split(':');
    var m = (+p[0]) * 60 + (+p[1]) + S.durationMin;
    return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
  }

  /* サンプル表示用。日付と時刻から決まるので、見るたびに変わらない */
  function sampleBooked(k, i) {
    var h = 0, s = k + '#' + i;
    for (var n = 0; n < s.length; n++) { h = (h * 31 + s.charCodeAt(n)) >>> 0; }
    var r = h % 10;
    return r < 3 ? S.capacity : (r < 5 ? S.capacity - 1 : (r < 7 ? 2 : 0));
  }

  function buildDays() {
    if (!S) return [];
    var out = [];
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var now = new Date();

    for (var i = 0; i < S.daysAhead; i++) {
      var d = new Date(today); d.setDate(today.getDate() + i);
      var k = key(d);
      var closed = S.closedWeekdays.indexOf(d.getDay()) !== -1 ||
                   (S.closedDates || []).indexOf(k) !== -1;
      var bk = (S.booked || {})[k] || {};
      var allFull = bk.ALL !== undefined;

      var slots = S.times.map(function (t, idx) {
        var taken = S.sample ? sampleBooked(k, idx)
                             : (allFull ? S.capacity : (bk[t] || 0));
        var past = false;
        if (i === 0) {
          var p = t.split(':');
          past = (+p[0]) * 60 + (+p[1]) <= now.getHours() * 60 + now.getMinutes();
        }
        return {
          time: t, end: endTime(t), past: past,
          left: Math.max(0, S.capacity - taken)
        };
      });

      out.push({
        date: d, key: k, label: label(d),
        weekday: WD[d.getDay()], closed: closed, slots: slots,
        isToday: i === 0
      });
    }
    return out;
  }

  /* その枠が選べるか。PRIVATE は枠ごと空いている必要がある */
  function bookable(s, plan) {
    if (s.past || s.left === 0) return false;
    return plan === 'private' ? s.left === S.capacity : true;
  }

  function statusOf(s, plan) {
    if (s.past) return { cls: 'is-past', text: '受付終了' };
    if (s.left === 0) return { cls: 'is-full', text: '満席' };
    if (plan === 'private' && s.left < S.capacity) return { cls: 'is-full', text: '貸切不可' };
    if (plan === 'private') return { cls: 'is-open', text: '空き' };
    return { cls: s.left === 1 ? 'is-few' : 'is-open', text: '残り' + s.left + '名' };
  }

  /* 直近の空き枠を n 件。LPで使う。
     同じ日に偏ると「いつ行けるか」が分からないので、1日1件までにする */
  function nextOpen(n, plan, perDay) {
    var out = [], lim = perDay || 1;
    var days = buildDays();
    for (var i = 0; i < days.length && out.length < n; i++) {
      var d = days[i];
      if (d.closed) continue;
      var c = 0;
      for (var j = 0; j < d.slots.length && out.length < n && c < lim; j++) {
        if (bookable(d.slots[j], plan)) { out.push({ day: d, slot: d.slots[j] }); c++; }
      }
    }
    return out;
  }

  return {
    data: S, WD: WD, key: key, label: label,
    buildDays: buildDays, bookable: bookable, statusOf: statusOf, nextOpen: nextOpen,
    isSample: function () { return !!(S && S.sample); }
  };
})();
