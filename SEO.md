# KUU SAUNA / SEO 引き継ぎメモ

## 公開前に必ず差し替えるもの
`https://example.com` を本番ドメインに置換（index.html / robots.txt / sitemap.xml）。
index.html 内の出現箇所：canonical、og:url、og:image、twitter:image、構造化データ内のURL。

構造化データの以下は仮の値：
- streetAddress / postalCode
- geo（緯度経度。今は浜松市役所付近の値）
- telephone（未記載。決まったら biz に追加）
- openingHoursSpecification（火曜定休として記述済み）

sitemap.xml の lastmod を公開日に。

## 構造化データ（どのページに何を入れたか）

| ページ | 内容 |
|---|---|
| `index.html` | HealthAndBeautyBusiness（住所・営業時間・設備8項目・料金2プラン・**予約という行為 ReserveAction**・地図）／ FAQPage 16件 ／ WebSite |
| `reserve.html` | BreadcrumbList（KUU SAUNA → 空き枠）／ WebPage |
| `thanks.html` `404.html` | なし（noindex のため不要） |

**まだ入れていない項目**（実データがないため）
- `telephone` … 電話番号を公開するなら追加する
- `sameAs` … Instagram・X などのアカウントができたら追加する
  （ローカル検索で効くので、開設したら必ず入れる）

## 入れたもの
- title / description をキーワード優先に書き換え
- OGP・Twitter Card 一式（画像サイズとalt付き）
- 構造化データ（JSON-LD）
  - HealthAndBeautyBusiness … 住所・営業時間・設備・料金2プラン
  - FAQPage … 本文のQ&A 7件と同内容
  - WebSite
- ヒーロー画像の preload（LCP対策。webp指定なので非対応ブラウザはスキップ）
- robots.txt / sitemap.xml
- フッターにサイト説明文を1段落

## 構造化データの検証
公開後、以下で確認する。
- リッチリザルトテスト https://search.google.com/test/rich-results
- Search Console のリッチリザルトレポート

FAQPage はリッチリザルトに出る可能性があるが、Googleの方針で
表示対象は変動する。出ないこともある。

## 既知の弱点
見出しにキーワードがほとんど入っていない。
h1「何もしない時間を、取り戻す。」、h2「料金。」「よくある質問。」など、
デザインを優先した結果、検索語との一致が薄い。

補える範囲で以下をやってある：
- h2「サウナ、水風呂、外気浴。90分の過ごし方。」でコア3語を通した
- コンセプト本文に「浜松の郊外」「完全予約制」「1枠は最大4名」が入っている
- ヒーロー下の1行に「静岡県浜松市｜完全予約制・1枠最大4名」
- フッターの説明文

それでも不足する場合は、見出しを直すよりブログやコラムなど
別ページを足すほうがデザインを壊さない。

---

## Google Search Console

GA4が「来た人が何をしたか」を見るのに対して、GSCは
**来る前に何で検索したか／何位に出たか**を見る。役割が違うので両方要る。

### 所有権の確認（3通り。どれか1つ）

| 方式 | 向いているケース | 作業 |
|---|---|---|
| **DNS（ドメインプロパティ）** | 独自ドメインを持っている | DNSにTXTレコードを1件追加 |
| **GTMコンテナ** | GTMを先に入れてある | GSCの画面で選ぶだけ |
| **HTMLタグ** | 上2つが使えない | index.html のコメントを外して検証コードを入れる |

**おすすめはDNS**。`https://` と `http://`、`www` あり／なし、
サブドメインまで1つのプロパティでまとめて見られる。
URLプレフィックス方式だと、これらが別サイト扱いになってデータが分散する。

GitHub Pagesで `*.github.io` のまま公開するならDNSは使えないので、
GTMかHTMLタグ方式になる。独自ドメインを当てる予定があるなら、
**ドメインを決めてからGSCを登録したほうが手戻りがない**。

HTMLタグ方式を使う場合、`index.html` の canonical のすぐ下に
コメントアウトした枠がある。そこを使う。
DNSかGTMで確認したなら、その枠ごと削除していい。

### ページ構成
- `/`            … LP
- `/reserve.html` … 空き枠。`changefreq: daily` でサイトマップに登録済み
- `/thanks.html`  … 予約完了。`noindex, follow`。サイトマップには**入れていない**
                    （検索結果に出す意味はないが、`nofollow` にはしていない。
                     このページからLP・空き枠へのリンク評価を止めないため）
- `/booking.html` … 入力・確認。`noindex, follow`（枠の指定が無いと成立しないページ）
- `/404.html`     … 見つからないページ。`noindex, follow`
                    GitHub Pages は直下の 404.html を自動で使う

`thanks.html` を robots.txt で Disallow しては**いけない**。
クロールを止めると `noindex` が読まれず、URLだけ登録されることがある。

### 公開前の注意（重要）

`slots.js` の `sample` が `true` のまま公開すると、
**空き枠ページに「サンプル」と書かれた状態で検索登録されます。**
公開前に必ず `false` にしてください。

空き枠ページは日々内容が変わるので、クロール頻度を高めに宣言してある。

### 登録したらやること

1. **サイトマップを送信**
   GSC > サイトマップ > `sitemap.xml` を入力して送信
2. **URL検査でインデックス登録をリクエスト**
   公開直後は自動クロールを待つと数日かかる
3. **リッチリザルト**
   構造化データ（FAQPage / LocalBusiness）が認識されているか、
   GSC > 拡張 のレポートで確認。エラーが出たら修正する

### 公開後に見る数字

| 見るところ | 何が分かるか |
|---|---|
| 検索パフォーマンス > クエリ | 実際にどんな言葉で見つかっているか |
| 同 > 平均掲載順位 | 「浜松 サウナ 貸切」などで何位か |
| 同 > CTR | 順位のわりに押されていないなら title/description を直す |
| カバレッジ | インデックスされない問題がないか |

クエリは想定とズレることが多い。「浜松 サウナ 完全予約制」で来ると
思っていたら「浜松 サウナ 空いてる」だった、みたいなことが起きる。
**ズレていたら title と description をそっちに寄せる**のが一番効く改善。

### Bing Webmaster Tools

Microsoft Clarity を入れるなら、同じMicrosoftアカウントで
Bing Webmaster Tools も登録しておくと手間が少ない。
GSCからサイトとサイトマップをインポートできる。
国内シェアは小さいが、作業は5分で終わる。

---

## 次にやると効くこと
1. Googleビジネスプロフィールの登録
   ローカル検索では構造化データより効く。GSCとは別物なので両方やる。
2. GSCのクエリを見て、title / description を実際の検索語に寄せる
3. 写真が6枚あるので、画像検索からの流入も見る（alt記述済み）
4. クエリが取れてきたら、見出しを直すのではなくコラムを別ページで足す
