import { test, expect, type Page } from "@playwright/test";

// ── Mock responses ──────────────────────────────────────────────────────────

const SCRAPE_SUCCESS = {
  success: ["ZENN", "QIITA"],
  failed: [],
  count: 10,
};

const SCRAPE_PARTIAL_FAILURE = {
  success: ["ZENN"],
  failed: [{ source: "QIITA", error: "timeout" }],
  count: 5,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** POST /api/scrape をモックする。delay(ms) で応答を遅延させられる */
async function mockScrapeRoute(
  page: Page,
  response: typeof SCRAPE_SUCCESS | typeof SCRAPE_PARTIAL_FAILURE,
  delay = 0
) {
  await page.route("**/api/scrape", async (route) => {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    await route.fulfill({ json: response });
  });
}

/** PATCH /api/articles/:id/read をモックする */
async function mockReadRoute(page: Page, isRead: boolean, status = 200) {
  await page.route("**/api/articles/*/read", async (route) => {
    if (status !== 200) {
      await route.fulfill({ status, body: "Server Error" });
      return;
    }
    const url = route.request().url();
    const id = url.match(/articles\/([^/]+)\/read/)?.[1] ?? "mock-id";
    await route.fulfill({
      json: {
        id,
        isRead,
        isFavorite: false,
        title: "テスト記事",
        url: "https://example.com",
        sourceType: "ZENN",
        tags: [],
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("ダッシュボード", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // 記事取得ボタン
  // ──────────────────────────────────────────────────────────────────────────
  test.describe("記事取得ボタン", () => {
    test("クリックでローディング表示になる", async ({ page }) => {
      // 500ms 遅延でローディング状態をキャプチャ
      await mockScrapeRoute(page, SCRAPE_SUCCESS, 500);
      await page.goto("/");

      const button = page.getByTestId("scrape-button");
      await button.click();

      await expect(button).toBeDisabled();
      await expect(button).toContainText("取得中");
    });

    test("スクレイピング完了後に件数が表示される", async ({ page }) => {
      await mockScrapeRoute(page, SCRAPE_SUCCESS);
      await page.goto("/");

      await page.getByTestId("scrape-button").click();

      const result = page.getByTestId("scrape-result");
      await expect(result).toContainText("10 件取得");
      await expect(result).toContainText("ZENN");
      await expect(result).toContainText("QIITA");
    });

    test("スクレイピング失敗時にエラーソースが赤字で表示される", async ({ page }) => {
      await mockScrapeRoute(page, SCRAPE_PARTIAL_FAILURE);
      await page.goto("/");

      await page.getByTestId("scrape-button").click();

      const result = page.getByTestId("scrape-result");
      await expect(result).toContainText("QIITA");
      // 失敗ソース名は赤字スパン内に含まれる
      await expect(result.locator("span.text-red-500")).toContainText("QIITA");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // フィルター
  // ──────────────────────────────────────────────────────────────────────────
  test.describe("フィルター", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    // ── ソースフィルター ──────────────────────────────────────────────────
    test("ソースフィルタークリックでURLが更新される", async ({ page }) => {
      await page.getByTestId("source-filter-ZENN").click();
      await expect(page).toHaveURL(/source=ZENN/);
    });

    test("アクティブなソースフィルターのスタイルが変わる", async ({ page }) => {
      const zennButton = page.getByTestId("source-filter-ZENN");
      await zennButton.click();
      await expect(zennButton).toHaveClass(/bg-blue-600/);
    });

    test("「すべて」をクリックするとソースフィルターが解除される", async ({ page }) => {
      await page.getByTestId("source-filter-ZENN").click();
      await expect(page).toHaveURL(/source=ZENN/);

      // value="" の「すべて」ボタン
      await page.getByTestId("source-filter-").click();
      await expect(page).not.toHaveURL(/source=/);
    });

    // ── 状態フィルター ────────────────────────────────────────────────────
    test("状態フィルター「未読」クリックでURLが更新される", async ({ page }) => {
      await page.getByTestId("status-filter-unread").click();
      await expect(page).toHaveURL(/status=unread/);
    });

    test("状態フィルター「既読」クリックでURLが更新される", async ({ page }) => {
      await page.getByTestId("status-filter-read").click();
      await expect(page).toHaveURL(/status=read/);
    });

    test("状態フィルター「お気に入り」クリックでURLが更新される", async ({ page }) => {
      await page.getByTestId("status-filter-favorite").click();
      await expect(page).toHaveURL(/status=favorite/);
    });

    test("ソースと状態フィルターを同時に選択できる", async ({ page }) => {
      await page.getByTestId("source-filter-ZENN").click();
      // 最初のナビゲーション完了を待ってから2つ目をクリック
      await expect(page).toHaveURL(/source=ZENN/);
      await page.getByTestId("status-filter-unread").click();
      await expect(page).toHaveURL(/status=unread/);
      await expect(page).toHaveURL(/source=ZENN/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 既読切替
  // NOTE: DB に未読記事が 1 件以上ないとスキップされるテストがあります。
  //       ローカルでは `npm run dev` 起動後にスクレイプを実行してから
  //       テストを実行してください。
  // ──────────────────────────────────────────────────────────────────────────
  test.describe("既読切替", () => {
    /** 最初のカードが未読状態で存在するか確認し、なければスキップ */
    async function getFirstUnreadCard(page: Page) {
      const card = page.getByTestId("article-card").first();
      const isVisible = await card.isVisible().catch(() => false);
      if (!isVisible) return null;
      const toggleText = await card.getByTestId("read-toggle").textContent();
      if (toggleText?.trim() !== "未読") return null;
      return card;
    }

    test("タイトルクリック直後に楽観的更新でカードが既読スタイルになる", async ({ page }) => {
      await mockReadRoute(page, true);
      await page.goto("/");

      const card = await getFirstUnreadCard(page);
      if (!card) {
        test.skip();
        return;
      }

      // 初期状態：未読（白背景）
      await expect(card).toHaveClass(/bg-white/);
      await expect(card.getByTestId("article-title")).toHaveClass(/text-zinc-900/);

      await card.getByTestId("article-title").click();

      // 楽観的更新後：既読（zinc-50 背景、zinc-400 テキスト）
      await expect(card).toHaveClass(/bg-zinc-50/);
      await expect(card.getByTestId("article-title")).toHaveClass(/text-zinc-400/);
    });

    test("タイトルクリックで状態ボタンが「既読」表示になる", async ({ page }) => {
      await mockReadRoute(page, true);
      await page.goto("/");

      const card = await getFirstUnreadCard(page);
      if (!card) {
        test.skip();
        return;
      }

      const readToggle = card.getByTestId("read-toggle");
      await expect(readToggle).toHaveText("未読");

      await card.getByTestId("article-title").click();

      await expect(readToggle).toHaveText("既読");
    });

    test("APIが失敗した場合は楽観的更新が取り消される", async ({ page }) => {
      await mockReadRoute(page, true, 500);
      await page.goto("/");

      const card = await getFirstUnreadCard(page);
      if (!card) {
        test.skip();
        return;
      }

      await card.getByTestId("article-title").click();

      // ロールバック後：未読に戻る
      await expect(card.getByTestId("read-toggle")).toHaveText("未読");
      await expect(card).toHaveClass(/bg-white/);
    });

    test("既読記事のタイトルをクリックしてもAPIが呼ばれない", async ({ page }) => {
      // ① まず未読→既読にする
      await mockReadRoute(page, true);
      await page.goto("/");

      const card = await getFirstUnreadCard(page);
      if (!card) {
        test.skip();
        return;
      }

      await card.getByTestId("article-title").click();
      await expect(card.getByTestId("read-toggle")).toHaveText("既読");

      // ② 既読状態になったカードのタイトルを再クリック
      let requestCount = 0;
      await page.route("**/api/articles/*/read", (route) => {
        requestCount++;
        return route.continue();
      });

      await card.getByTestId("article-title").click();
      await page.waitForTimeout(300);

      expect(requestCount).toBe(0);
    });
  });
});
