# 進捗報告 2026-08-03（2026-07-27〜08-02）

> 2026-08-01時点のドラフト。検証済みマイルストーンとライブ状態の変化ごとに追記する。

## 1. 目的

ペルソナ・個人間関係・感情をMineColonies上の実行可能な社会行動へ接続する前に、
既存実装の不具合を解消し、卒業研究として再現可能な比較実験を行える基盤を整える。

## 2. 実施内容

### 2.1 研究方針の整理

- 新規な感情アーキテクチャそのものの提案ではなく、既存の認知的評価モデルを参照しながら、
  ペルソナ・動的感情・有向な個人間関係をゲーム内行動と結果へ接続する閉ループを主な候補とした。
- 卒論の最小完成線として、困窮検出、援助要請、相手選択、実行、成否確認、関係更新を
  再現可能な条件で比較する方針を検討した。研究室教員との相談後に研究質問と新規性を確定する。
- OCC/FAtiMA型appraisalを参照した最小モデルを採用した。完全準拠や新規感情理論の主張はせず、
  各判断の寄与を記録できる実験用近似として実装した。

### 2.2 ペルソナ拡張前の保全

- バグ修正commit `4c9a7fc`を`origin`と`fork`へpushし、拡張前のソース復元点とした。
- personas、templates、social graph、dynamic state、イベントログ約11MBを時刻付きでバックアップし、
  SHA-256を確認した。

### 2.3 Phase 3 最小appraisal・援助閉ループ

- 既存P1からfamily、community、fairness、reciprocity、autonomyを決定論的に導出し、
  relevance、goalCongruence、normCompatibility、controllability、selfCostを評価する
  `voyager-appraisal-v1`を実装した。
- concern、obligation、reluctance、distressを中間状態としてhelp/refuseを採点し、全寄与を保存する。
- 関係辺に相互非対称な`perspectives`を後方互換追加した。
- append-only行動キューを追加し、social_observerがoffsetを保存して結果を一度だけreducerへ適用する。
- Bridgeへ`/citizenInventory`、近接制約付き`/transferCitizenItem`、`/status.position`を追加した。
- `social_help_daemon.js`が困窮者、関係者、所持食料を選び、実移動後に既存食料を1個移転する。
- 資源不足は`help_unable`、移動・API失敗は`help_failed`として、意図的拒否と区別する。

### 2.4 一時欠落による誤死亡の修正

- `persona_daemon.js`は、市民が`/status`から3 poll連続で欠落すると死亡扱いしていた。
  実環境では生存市民24がこの条件を満たし、`personas.json`で誤って`deceased=true`になっていた。
- `/status`上の欠落だけでは死亡を確定できないため、死亡印を暫定状態として扱い、同じ市民IDが
  再出現した場合に`deceased`と`deceasedAt`を自動解除して`restored`イベントを記録するよう修正した。
- この変更は既存の欠落3 poll規則と家系履歴を維持しつつ、誤判定を自己修復可能にする。
- ライブ名と台帳名が異なる市民8・24も確認されたため、安定IDと家系を維持したまま表示名を同期し、
  `identity_updated`イベントで旧名と新名を記録するようにした。

## 3. 検証結果

| 項目 | 結果 |
|---|---|
| P1単体テスト | 17/17 PASS（再出現後の復活・ライブ名同期テストを追加） |
| Phase 1関係グラフ | 8/8 PASS |
| Phase 2動的状態 | 7/7 PASS |
| `git diff --check` | PASS |
| ライブ復活確認 | PASS。市民24を`restored`し、`deceased=false`を永続化 |
| ライブ名同期 | PASS。市民8・24で`identity_updated`を一度だけ記録 |
| Appraisal単体テスト | 5/5 PASS |
| Phase 3動的状態 | 8/8 PASS |
| 行動キュー | PASS（partial line保留、byte offset再開） |
| observer行動適用 | PASS（同一イベントを一度だけ適用） |
| 援助daemon | PASS（成功・shadow・失敗・資源不足） |
| Bridgeビルド | JDK17、BUILD SUCCESSFUL |
| 市民位置 | 35/35取得 |
| 遠距離移転拒否 | 166.1ブロックをHTTP 500で拒否、所持数不変 |
| 資源保存 | 1個往復で送信96→95→96、受信0→1→0 |
| ライブ援助 | 市民17→18、実移動後steak dinner 1個移転成功 |
| 非対称関係更新 | 受益者側trust 0.50→0.58、offset 275/275 |

## 4. 現在のライブ状態

- Minecraft/Forge、Bridge `localhost:8089`、persona_daemon、social_observer、supply_botが稼働中。
  councilは停止中。
- コロニー`NormalActual`は35市民。市民24 `June D. Harris`の生存を`/status`で確認した。
- 修正版persona_daemonをライブ再起動し、市民24の誤死亡を解除した。現在の台帳は
  `deceased=false`、`deceasedAt=null`、name=`June D. Harris`。
- Bridge最終版を配備し、全建物範囲255チャンクと適応tickrateを復元した。
- social_helpは限定`--once`試験のみ。連続自動実行は係数較正前のため開始していない。

## 5. 未解決事項

- `/status`欠落を死亡とみなす3 poll規則自体には推測が残る。将来、MineColonies側から
  権威ある死亡イベントを取得できるか調査する余地がある。
- guardの`WAIT_FOR_FOOD`ウェッジ、Restaurant blueprintの座席欠落、forceload上限付近の運用など、
  以前からの既知問題は未解消。
- 既存未追跡の`compare_metrics.js`、`ops.js`、`zone_audit.js`は変更せず保全中。
- appraisal係数、拒否ペナルティ、softmax temperature、明示的な価値遺伝は未較正。
- 移動timeoutは適応tickrateで初回失敗し、ゲーム内1200秒へ延長して成功した。実距離別の上限は要計測。

## 6. 次の一週間

1. appraisal係数を極端ペルソナと複数seedで操作チェックする。
2. ペルソナなし／関係なし／関係あり／appraisalありの比較runnerと集計を作る。
3. 限定ライブ試行を増やし、移動距離・成功率・回復時間を測定する。
4. 教員相談後、価値の明示的遺伝と持続感情を実装対象にするか決める。

## 7. 主要コミット

- `4c9a7fc` — 誤死亡自己修復、名前同期、週次報告開始（両remoteへpush済み）
- Phase 3閉ループ実装 — 本報告を含む後続commit（ライブ検証済み、両remoteへ反映）。
