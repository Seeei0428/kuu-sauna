KUU SAUNA / ファイル構成

index.html      LP
reserve.html    空き枠ページ
style.css       2ページ共通
main.js         2ページ共通（ヘッダー・FAQ・計測・LPの直近の空き）
schedule.js     2ページ共通。slots.js から日ごとの枠を組み立てる
reserve.js      空き枠ページの操作
booking.html    お申し込み内容の入力・確認（noindex, follow）
booking.js      その動き
thanks.html     予約完了ページ（noindex, follow）
404.html        見つからないページ（GitHub Pages が自動で使う）
thanks.js       完了ページの表示（控え）
slots.js        ★ 空き状況のデータ。更新するのはこのファイルだけ
images/         写真とアイコン
favicon.ico / site.webmanifest / robots.txt / sitemap.xml
SEO.md / ANALYTICS.md   引き継ぎメモ


■ 空き状況の更新
slots.js だけを書き換えてください。LPの「直近の空き」と
空き枠ページの両方に、同じデータが反映されます。

  sample: false            ← 本番データを載せるときに false へ
  booked: {
    '2026-10-01': { '10:00': 4, '14:00': 2 },
    '2026-10-05': { 'ALL': 4 }
  }

枠そのものは times / closedWeekdays / daysAhead から自動で作られるので、
日々の予定を手で書き並べる必要はありません。


■ 2ページのつながり
LP 料金カード      → reserve.html?plan=standard / ?plan=private
LP 直近の空き      → reserve.html?date=2026-09-27&time=10:00（枠を選んだ状態で開く）
LP 予約ボタン2箇所 → reserve.html
空き枠ページのナビ → index.html#flow など

空き状況の計算は schedule.js の 1 か所だけなので、
2ページで表示が食い違うことはありません。


■ 予約の流れ
  空き枠 → booking.html（人数・連絡先を入力して確認）
        → 決済事業者のページ（カード情報はここだけ）
        → thanks.html（当日の案内）

  ★ カード番号をこのサイトで受け取ってはいけない。
    静的サイトには安全に扱う手段が無く、入力された番号が
    どこにも送られないままURLやブラウザに残ってしまう。
    必ず決済事業者のページで入力してもらうこと。

■ 申し込みの行き先は4通り（booking.js が自動で切り替える）
  1) slots.js の payment.url あり
       → 決済ページへ。決済側が thanks.html に戻す
       （formEndpoint も設定してあれば、
         内容を送ってから決済ページへ。送信に失敗したときは
         決済ページへ進ませず、その場でやり直せる）
  2) slots.js の formEndpoint あり
       → 申し込み内容を送信してから thanks.html へ
  3) どちらも無く sample:true（いまの状態）
       → そのまま thanks.html。「動作確認用」と明示される
  4) どちらも無く sample:false（本番）
       → メールでの申し込みに切り替わる
          何も送らずに完了画面を出すと、予約できていないのに
          予約できたと誤解させてしまうため

■ メールを使わず、サイト内で完結させる（いまの設定）
  confirmEmail: false

  お客さまに確認メールは送らない。完了ページがそのまま控えになる。
    ・予約の日時とプラン
    ・ご利用人数と受付番号（お問い合わせのとき、これで照合する）
    ・持ちもの、道順、キャンセル規定

  完了ページのURLには枠の情報が入るので、
  ブックマークすれば開き直せる。決済から戻ってきて
  URLに情報が付いていない場合も、ブラウザの控えから復元して
  URLを書き換える。枠の終了から6時間で消える。

  ★ この運用には Stripe が要る。
    決済が「予約を受けた記録」と「店舗への通知」を兼ねるため。
    Stripe の管理画面に client_reference_id として
    「20261020-1800-private-4」のように、どの枠かが残る。

    決済もフォームも設定しないまま公開すると、
    店舗側に申し込みが一切届かなくなる。
    そのため booking.js は、その状態では
    メールでの申し込み（mailto）に自動で切り替える。
    サイト内で完結させたいなら、Stripe は飛ばせない。

  自動返信を使う運用に戻すときは confirmEmail を true に。

■ 確認メール（slots.js の confirmEmail）
  true のままにする場合は、自動返信が本当に届くか確かめること。
    FormSubmit … 無料。slots.js の autoResponse が本文になる
    Formspree  … 自動返信は Professional（$20/月〜）
    Web3Forms  … 自動返信は Pro（$12/月〜）
    Stripe     … 領収書は自動。ただし予約日時は載らない

  ★ 無料プランのまま自動返信が無いサービスを使う場合は false に。
    true のままだと、完了ページが「確認メールをお送りしました」と
    出るのに実際は届かない。

  設定しないまま true にすると、完了ページが「確認メールをお送り
  しました」と表示するのに実際は届かない、という状態になる。

  送らない方針なら false にする。完了ページが
  「この画面が、ご予約の控えです」に切り替わり、
  受付番号とあわせて、この画面が控えになる。

  完了ページの文言は、設定に合わせて3通りに自動で切り替わる。
    formEndpoint あり … 「確認メールをお送りしました」
                        （日時入りの自動返信が届くため）
    決済URLのみ        … 「お支払いが完了しました／領収書は
                        決済会社から。日時はこの画面で」
    どちらも無い       … 「この画面が、ご予約の控えです」

  届かないメールを案内しないための切り替えなので、
  手で書き換えないこと。

■ 確認メールを無料で届ける（FormSubmit・登録不要）
  1) slots.js の formEndpoint に、受信したいアドレスを入れる
       'https://formsubmit.co/owner@example.com'
  2) 公開して、一度テスト送信する
  3) そのアドレスに FormSubmit から確認メールが届くので、
     リンクを押して有効化する（初回だけ）
  4) 同時に文字列（ランダムな英数字）が発行される。
     formEndpoint をそれに差し替える
       'https://formsubmit.co/abc123def456...'
     ページのソースにメールアドレスが出なくなり、迷惑メール対策になる

  自動返信の本文は slots.js の autoResponse。
  申し込み内容の控え（枠・人数・お名前など）が添えられて届くので、
  日時も伝わる。

  ★ この会社の自動返信には条件がある。
      ・ふつうのフォーム送信であること（fetch では動かない）
      ・reCAPTCHA を切らないこと（_captcha=false にしない）
    booking.js は、formEndpoint が formsubmit.co のときだけ
    自動でこの送り方に切り替える。触らなくてよい。

    そのぶん、お客さまには「私はロボットではありません」の
    画面が一度はさまる。そのあと自動で完了画面（または決済ページ）
    に戻る。画面の案内文もそう書いてある。

■ 決済を使わず、申し込みだけ受ける場合
  slots.js の formEndpoint に、フォームサービスのURLを入れる
    FormSubmit（無料・自動返信あり）/ Formspree / Basin / Getform
  送信される項目：枠・プラン・人数・お名前・メール・電話・
                  サウナのご利用・ご要望・合計・受付番号

■ 決済につなぐ（Stripe の手順）

【1】Stripe で決済リンクを作る
  ダッシュボード > 支払いリンク > 新規作成

  PRIVATE（貸切）… 1本だけ作る。金額 16,800円
  STANDARD（1名4,980円）… 人数で金額が変わるので、
    1名用 4,980 / 2名用 9,960 / 3名用 14,940 / 4名用 19,920
    の4本を作る。
    ※ Stripe の支払いリンクは、URLで人数を指定できない。
      お客さまに数量を選ばせると、こちらで受けた人数と
      ずれることがあるので、人数ごとに分けるのが確実。

【2】各リンクの「支払い後」の設定
  「確認ページ」ではなく「指定のURLにリダイレクト」を選び、
       https://（本番ドメイン）/thanks.html
  とだけ入れる。

  ★ ここに ?date={date} のような文字を足さないこと。
    Stripe の遷移先は固定URLで、日時は埋め込めない。
    枠の情報は、決済ページへ移る直前にブラウザへ控えてあり、
    戻ってきたときに自動で復元される（6時間で破棄）。

【3】slots.js に貼る
  payment: {
    urlByPlan: {
      private: 'https://buy.stripe.com/xxxx?prefilled_email={email}&client_reference_id={ref}'
    },
    urlByQty: {
      standard: {
        1: 'https://buy.stripe.com/aaaa?prefilled_email={email}&client_reference_id={ref}',
        2: 'https://buy.stripe.com/bbbb?prefilled_email={email}&client_reference_id={ref}',
        3: '...', 4: '...'
      }
    }
  }
  使われる順番は urlByQty → urlByPlan → url。
  使える置き換え: {email} {name} {qty} {date} {time} {end}
                  {plan} {planLabel} {total} {ref}

  client_reference_id={ref} を付けておくと、Stripe の管理画面に
  「20261007-1000-standard-2」のように、どの枠の支払いか残る。

【4】領収書メールを有効にする
  設定 > 顧客メール > 「支払い成功時」をオンにする。

  ただし Stripe の領収書には、商品名と金額しか載らない。
  予約した日時は載らない。完了ページの控えで
  補う作りにしてあるが、日時入りの確認メールを届けたいなら
  次の併用が確実（作業は10分ほど）。

■ 日時入りの確認メールも届けたい場合（Stripe と併用）
  formEndpoint も設定する。順番は「内容を送る → 決済ページへ」。
  お客さまには日時入りの控えが、店舗側には申し込み通知が届く。

  FormSubmit を使う場合（無料）
    申し込む → 確認画面（ロボット確認）→ 決済ページ → 完了画面
    の順に進む。自動返信はこの時点で送られる。

  Formspree などを使う場合
    fetch で送ってから決済ページへ移る。
    送信に失敗したときは決済ページへ進ませない。
    自動返信は有料プランが必要。

  payment.url が空のあいだは「オンライン決済は準備中」と表示し、
  入力内容が本文に入ったメールでの申し込みに切り替わります。


■ 外部の予約システムを使う場合（booking.html を使わない）
   slots.js の booking.url を設定すると、空き枠ページの
   「予約に進む」が直接その予約システムへ飛びます。
   入力も決済もそちらで完結するので booking.html は経由しません。

■ 旧：外部の予約システムにつなぐ（3か所）
1) slots.js の booking.url に、予約システムのURLを入れる
     'https://（予約システム）/booking?date={date}&time={time}'
   プランごとにページが分かれていれば booking.urlByPlan に入れる
   （{date} {ymd} {time} {end} {plan} {planLabel} が使えます）

2) 予約システム側の「完了後の遷移先」に thanks.html を設定
     https://（本番ドメイン）/thanks.html?date={date}&time={time}&plan={plan}
   日付を渡せないシステムなら thanks.html だけでも可

3) GA4 のドメイン間トラッキングと参照元除外に、
   予約システムのドメインを登録（ANALYTICS.md 参照）

booking.url が空のあいだは、選んだ枠が本文に入ったメールに
切り替わるので、つなぐ前でも予約の取りこぼしは起きません。


■ 404.html について（サブパス配信のときは要編集）
  404 は「/foo/bar/存在しないページ」のような、どの深さのURLでも
  返されます。相対パスだとそのURLを基準に探してしまい、絶対パスだと
  GitHub Pages のサブパス配信で外れます。どちらも当たらないので、
  このページだけ CSS を埋め込んで自己完結させてあります。

  リンクは <base href="/"> を基準にしています。
    独自ドメイン（kuu-sauna.jp など）    … "/" のままでよい
    user.github.io/リポジトリ名/ で公開 … "/リポジトリ名/" に変える

■ 公開前に差し替えるもの
slots.js    bookingUrl（予約システムのURL）／contactEmail
            空のままなら、選んだ枠が本文に入ったメールに切り替わります
index.html / reserve.html / robots.txt / sitemap.xml
            https://example.com を本番ドメインへ
index.html / reserve.html / booking.html / thanks.html / 404.html
            GTM-XXXXXXX をコンテナIDへ（各ページ head と body の2箇所・計6箇所）
reserve.html / thanks.html  住所・アクセス・キャンセル規定
