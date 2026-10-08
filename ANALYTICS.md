# KUU SAUNA / 計測の設定メモ

## 構成

コードに埋め込んであるのは **GTMコンテナ1本だけ**。
GA4 と Microsoft Clarity は GTM のタグとして設定する。

```
index.html ──> GTM ──┬──> GA4
                     └──> Microsoft Clarity
```

GA4とClarityをHTMLに直接書かない理由：
管理場所が2つに分かれると、タグを止めたり差し替えたりするたびに
コードを触ってデプロイし直すことになる。GTMに寄せれば画面上で完結する。

---

## 1. GTM

`GTM-XXXXXXX` を実際のコンテナIDに差し替える。**3ページすべて**にある。

| ファイル | 箇所 |
|---|---|
| `index.html` | `<head>` のスクリプト と `<body>` 直後の `<noscript>` |
| `reserve.html` | 同上 |
| `booking.html` | 同上 |
| `thanks.html` | 同上 |
| `404.html` | 同上 |

エディタの一括置換で `GTM-XXXXXXX` を置き換えるのが確実。
`<noscript>` 側を忘れると、JavaScript 無効環境で計測が落ちる。

GTMは5ページすべてに入っているので、GA4 も Clarity も
タグを1つ設定すれば全ページで動く。ページごとの追加作業は不要。

---

## 2. GA4 を GTM に載せる

1. GA4 でプロパティを作り、測定ID（`G-XXXXXXXXXX`）を取得
2. GTM で **タグ > 新規 > Google タグ**
   - タグID: `G-XXXXXXXXXX`
   - トリガー: `All Pages`
3. 下の「カスタムイベント」を GA4 に流すタグを別途作る

### カスタムイベント（このLPが送っているもの）

| イベント名 | 送るタイミング | パラメータ |
|---|---|---|
| `cta_click` | 予約系リンクのクリック | `cta_location` / `cta_text` |
| `faq_open` | FAQを開いた | `faq_question` |
| `scroll_depth` | 25 / 50 / 75 / 100% 到達 | `percent_scrolled` |
| `section_view` | 各セクションが4割見えた | `section_id` |

`section_id` の値（ページ順）：`concept` / `position` / `flow` / `drink` / `spec` / `price` / `faq` / `reserve`

`cta_location` に、申し込みボタンの状態が入る

| 値 | 意味 |
|---|---|
| `go_payment` | 決済ページへ進んだ |
| `submit_form` | フォームで申し込みを送信した |
| `submit_demo` | 動作確認用（公開前の状態） |
| `go_payment_email` | メールでの申し込み |

`submit_demo` が本番で出ていたら設定漏れ。すぐ気づけるよう分けてある。

`cta_location` の値

| 値 | 場所 |
|---|---|
| `bookbar` | LP下部の常時表示バー |
| `next_slot` | LPの「直近の空き」チップ |
| `plan_standard` / `plan_private` | 料金カードから空き枠へ |
| `reserve_section` | LP末尾の「空き枠を見る」 |
| `slot_confirm` | 空き枠ページの「予約に進む」 |
| `email` | メールリンク |

`next_slot` と `plan_*` は、**LPのどこから空き枠ページへ入ったか**を分ける。
チップ経由が多ければ「空いている日を知りたい」、プラン経由が多ければ
「貸切かどうかを先に決めたい」という入り方が主だと分かる。

### 空き枠ページ（reserve.html）のイベント

| イベント名 | 送るタイミング | パラメータ |
|---|---|---|
| `slot_select` | 枠を選んだ | `slot_date` / `slot_time` / `slot_plan` |
| `booking_details` | 入力内容を確認した（booking.html） | `slot_date` / `slot_time` / `slot_plan` / `party_size` / `value` |
| `booking_complete` | 完了ページ（thanks.html）に到達 | `slot_date` / `slot_time` / `slot_plan` |
| `page_not_found` | 404ページに到達 | `missing_path` / `came_from` |
| `plan_switch` | STANDARD ⇄ PRIVATE を切り替えた | `plan_name` |

`slot_select` と `cta_click:slot_confirm` の差が、
「枠は選んだが予約に進まなかった」人数になる。ここが大きければ、
枠を選んだあとの導線か、価格の見せ方に問題がある。

GTMでの受け取り方は上と同じ。データレイヤー変数として
`slot_date` `slot_time` `slot_plan` `plan_name` を追加で作る。
（ヘッダーの予約ボタンは廃止済み。`header` は送られない）

### GTMでの受け取り方

1. **変数 > 新規 > データレイヤーの変数** を、使うパラメータ名の数だけ作る
   （`cta_location`, `cta_text`, `faq_question`, `percent_scrolled`, `section_id`）
2. **トリガー > 新規 > カスタムイベント** をイベント名ごとに作る
3. **タグ > 新規 > Google アナリティクス: GA4 イベント**
   - イベント名にそのままイベント名を入れる
   - イベントパラメータに上の変数を紐づける

### 外部の予約システムを挟むときの注意

予約と決済は別ドメイン（Coubic など）で行われ、終わってから
`thanks.html` に戻ってきます。このとき GA4 は、何もしないと
**戻ってきた人を「別サイトからの新規訪問」として数えます**。
LPを見た人と予約した人が別人に見え、経路がつながりません。

対策を2つとも行ってください。

1. **ドメイン間のトラッキング**
   GA4 管理 > データストリーム > ウェブ > タグの設定 >
   ドメインの設定 に、自社ドメインと予約システムのドメインを両方登録。
2. **参照元除外**
   同じ画面の「除外する参照のリスト」に予約システムのドメインを追加。

予約システム側が外部ドメインへのパラメータ引き継ぎに対応していない場合、
1 は効きません。その場合は `booking_complete` を単独の到達点として扱い、
LPからの経路は `slot_select` までで見ることになります。

### 完了ページ（thanks.html）の設定

予約システムの「予約完了後の遷移先」に、次を設定してください。

    https://（本番ドメイン）/thanks.html?date={date}&time={time}&plan={plan}

日付などを渡せないシステムなら `thanks.html` だけでも動きます
（その場合、予約内容は出ず、案内だけ表示されます）。

### GA4側でやること

`booking_complete` を **キーイベント（旧コンバージョン）** に設定する。
これが実際に予約が成立した数。`cta_click` は入口の数でしかない。

脱落がどこで起きているかは、次の4つの差で分かる。

    slot_select → cta_click:slot_confirm → booking_details → booking_complete
      枠を選んだ      入力ページへ進んだ      入力を終えた      支払いが済んだ

`booking_details` が少なければ入力フォームが重い。
`booking_details` と `booking_complete` の差が大きければ、
**決済ページで落ちている**（金額の見え方、決済手段、入力項目）。

カスタムディメンションの登録も必要（登録しないとレポートで
パラメータが見えない）：`cta_location`、`section_id`、`faq_question`。
管理 > カスタム定義 > カスタムディメンションを作成。

---

## 3. Microsoft Clarity を GTM に載せる

1. Clarity でプロジェクトを作り、プロジェクトIDを取得
2. GTM で **タグ > 新規 > カスタムHTML**
3. 中身（`YOUR_CLARITY_ID` を差し替え）：

```html
<script>
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "YOUR_CLARITY_ID");
</script>
```

4. トリガー: `All Pages`

GTMに「Microsoft Clarity」のテンプレートがある場合はそちらでもいい。

### Clarityで見るとよいもの

- **ヒートマップ** … ヒーローの「予約する」と、下のFABのどちらが押されているか
- **スクロールマップ** … 水面のバンドや枝のバンドで離脱していないか。
  文字のない全幅写真は「終わり」と誤解されることがあるので、ここは要確認
- **レコーディング** … 料金セクションで止まる人の動き

Clarity は GA4 と連携できる（Clarity側の設定 > GA4連携）。
つなぐと GA4 のセグメントから該当セッションの録画に飛べる。

---

## 4. 公開前のチェック

- [ ] `GTM-XXXXXXX` を5ページ（index / reserve / booking / thanks / 404）すべて差し替えた
- [ ] GTMプレビューモードで4種のイベントが発火するか確認
- [ ] GA4のリアルタイムで `cta_click` が届くか確認
- [ ] 空き枠ページで `slot_select`、完了ページで `booking_complete` が届くか確認
- [ ] Clarityにセッションが記録されるか確認

---

## 5. プライバシーまわり（未対応・要判断）

GA4もClarityもCookieを使い、Clarityは**画面の操作を録画**する。
日本国内向けでも、外部送信の告知が必要になる場合がある
（電気通信事業法の外部送信規律／個人情報保護法）。

現状このLPには次のどれも入っていない：

- プライバシーポリシーのページ
- Cookieの同意バナー
- 外部送信についての告知

最低限、**プライバシーポリシーを1ページ作ってフッターからリンク**
するのが現実的な線。同意バナーまで出すかは、このサイトの性格
（予約は外部システム、フォームなし）を考えると運営の判断。

なお同意バナーを入れる場合、デザイン上はページ下部に固定される
FABと干渉する。入れるなら設計し直しが必要。

法務の話なので、最終判断は専門家に確認してほしい。
