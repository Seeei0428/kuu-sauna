/* ============================================================
   KUU SAUNA — main.js (v2)
   動きは最小限。ユーザーの操作に返す動きだけを入れる。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- ヘッダーの状態 ---------- */
  var head = document.getElementById('head');
  var hero = document.getElementById('hero');

  if (head && hero && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    // ヒーロー下部の数字がヘッダーに潜る前に、ヘッダーを不透明へ切り替える
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:calc(100% - 13rem);pointer-events:none;';
    hero.appendChild(sentinel);

    new IntersectionObserver(function (entries) {
      head.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* ------------------------------------------------------------
     写真パネルの表示アニメーション
     計測用の section_view とは別のObserverにしてある。
     同じものを使うと、見た目の調整（閾値）が計測基準まで変えてしまう。
     ------------------------------------------------------------ */
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    var panels = document.querySelectorAll('#flow .panel');
    if (!panels.length) return;

    // ここで初めて「隠す」CSSが効く。JSが動かなければ全部見えたまま
    document.documentElement.classList.add('has-reveal');

    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        ro.unobserve(e.target);   // 一度だけ
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    Array.prototype.forEach.call(panels, function (p) { ro.observe(p); });
  })();

  /* ---------- よくある質問 ---------- */
  var qs = document.querySelectorAll('.q');

  Array.prototype.forEach.call(qs, function (q) {
    var btn = q.querySelector('.q__btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';

      Array.prototype.forEach.call(qs, function (other) {
        if (other === q) return;
        other.classList.remove('is-open');
        var b = other.querySelector('.q__btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });

      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      q.classList.toggle('is-open', !open);
    });
  });

  /* ============================================================
     計測用イベント（dataLayer へ push）
     GTM側でトリガーを作って GA4 に送る。ANALYTICS.md 参照。
     GTM未導入でもエラーにならないよう dataLayer は自前で用意する。
     ============================================================ */
  window.dataLayer = window.dataLayer || [];

  var push = function (name, params) {
    var o = { event: name };
    for (var k in params) { if (params.hasOwnProperty(k)) o[k] = params[k]; }
    window.dataLayer.push(o);
  };

  Array.prototype.forEach.call(document.querySelectorAll('[data-cta]'), function (el) {
    el.addEventListener('click', function () {
      push('cta_click', {
        cta_location: el.getAttribute('data-cta'),
        cta_text: (el.textContent || '').trim()
      });
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.q__btn'), function (btn) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('aria-expanded') !== 'true') return;
      push('faq_open', { faq_question: (btn.textContent || '').trim() });
    });
  });

  /* --- 読了率 --- */
  (function () {
    var marks = [25, 50, 75, 100];
    var done = {};
    var ticking = false;

    var check = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      var pct = (window.pageYOffset / max) * 100;
      for (var i = 0; i < marks.length; i++) {
        if (pct >= marks[i] && !done[marks[i]]) {
          done[marks[i]] = true;
          push('scroll_depth', { percent_scrolled: marks[i] });
        }
      }
    };

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { check(); ticking = false; });
    }, { passive: true });

    check();
  })();

  /* --- セクション到達（1ページなのでGA4のページ遷移が使えない） --- */
  if ('IntersectionObserver' in window) {
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || seen[e.target.id]) return;
        seen[e.target.id] = true;
        push('section_view', { section_id: e.target.id });
      });
    }, { threshold: 0.4 });

    ['heat', 'cold', 'air', 'rest', 'price', 'guide', 'access'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
  /* ------------------------------------------------------------
     直近の空き枠（LPのみ）
     空き枠ページと同じ schedule.js から読むので、表示が食い違わない
     ------------------------------------------------------------ */
  (function () {
    var box = document.getElementById('nextSlots');
    if (!box || !window.KUU || !window.KUU.data) return;

    var list = window.KUU.nextOpen(3, 'standard');
    var sample = window.KUU.isSample()
      ? '<span class="next__s">サンプル</span>' : '';

    if (!list.length) {
      box.innerHTML = '<p class="next__t">直近の空き' + sample + '</p>' +
        '<p class="next__none">2週間先まで空きがありません。' +
        '<a href="reserve.html">先の日程を見る</a></p>';
      return;
    }

    var html = '<p class="next__t">直近の空き' + sample + '</p><ul class="next__list">';
    list.forEach(function (x) {
      html += '<li><a class="next__chip" data-cta="next_slot" href="reserve.html?date=' +
        x.day.key + '&time=' + encodeURIComponent(x.slot.time) + '">' +
        '<span class="next__d">' + x.day.label + '</span>' +
        '<span class="next__h">' + x.slot.time + '</span></a></li>';
    });
    box.innerHTML = html + '</ul>';

    // 描画後に生成したリンクなので、計測はここで繋ぐ
    Array.prototype.forEach.call(box.querySelectorAll('[data-cta]'), function (el) {
      el.addEventListener('click', function () {
        (window.dataLayer = window.dataLayer || []).push({
          event: 'cta_click', cta_location: 'next_slot',
          cta_text: (el.textContent || '').trim().replace(/\s+/g, ' ')
        });
      });
    });
  })();

})();
