// Regression tests. Run with `npm i --no-save playwright && node --test tests/` (needs Chromium).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const pageUrl = pathToFileURL(fileURLToPath(new URL("../index.html", import.meta.url))).href;
let browser;

before(async () => {
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
});

async function openPage(viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage({ viewport });
  // Block external font requests so tests run offline.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("requestfailed", (req) => {
    if (req.url().startsWith("file:")) errors.push(`missing ${req.url()}`);
  });
  await page.goto(pageUrl);
  return { page, errors };
}

const cardStates = (page) =>
  page.$$eval(".product-card", (cards) =>
    cards.map((c) => ({
      category: c.dataset.category,
      shown: getComputedStyle(c).display !== "none" && !c.classList.contains("is-filtering-out"),
    })),
  );

test("loads without script errors or missing local assets", async () => {
  const { page, errors } = await openPage();
  // Scroll through the page so lazy images load too.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await page.waitForLoadState("networkidle");
  const broken = await page.$$eval("img", (imgs) =>
    imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(broken, []);
  await page.close();
});

test("filter shows only the selected category", async () => {
  const { page } = await openPage();
  await page.click('[data-filter="fragancias"]');
  await page.waitForTimeout(400);
  for (const card of await cardStates(page)) {
    assert.equal(card.shown, card.category === "fragancias", card.category);
  }
  await page.close();
});

test("switching filters quickly does not leave cards hidden", async () => {
  const { page } = await openPage();
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        document.querySelector('[data-filter="fragancias"]').click();
        setTimeout(() => {
          document.querySelector('[data-filter="all"]').click();
          resolve();
        }, 100);
      }),
  );
  await page.waitForTimeout(600);
  const hidden = (await cardStates(page)).filter((c) => !c.shown);
  assert.equal(hidden.length, 0);
  await page.close();
});

test("revealed cards keep hover lift and filter fade", async () => {
  const { page } = await openPage();
  const card = page.locator(".product-card").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForFunction((el) => !el.classList.contains("reveal"), await card.elementHandle(), { timeout: 3000 });
  await card.hover();
  await page.waitForTimeout(600);
  const translateY = await card.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  assert.ok(translateY < -3, `expected hover lift, got translateY=${translateY}`);

  await page.mouse.move(0, 0);
  // Sample opacity every frame during the 260ms fade window and keep the lowest value.
  const opacity = await card.evaluate(
    (el) =>
      new Promise((resolve) => {
        let min = 1;
        const start = performance.now();
        const other = [...document.querySelectorAll(".filter-btn")].find(
          (b) => b.dataset.filter !== "all" && b.dataset.filter !== el.dataset.category,
        );
        other.click();
        (function sample() {
          min = Math.min(min, Number(getComputedStyle(el).opacity));
          if (performance.now() - start < 250) requestAnimationFrame(sample);
          else resolve(min);
        })();
      }),
  );
  assert.ok(opacity < 0.9, `expected card to fade out, got min opacity=${opacity}`);
  await page.close();
});

for (const width of [375, 800, 1024, 1440]) {
  test(`no horizontal overflow at ${width}px`, async () => {
    const { page } = await openPage({ width, height: 900 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.equal(scrollWidth, width);
    await page.close();
  });
}

test("mobile nav toggles and closes after choosing a link", async () => {
  const { page } = await openPage({ width: 800, height: 900 });
  const nav = page.locator("#main-nav");
  assert.equal(await nav.isVisible(), false);
  await page.click("#nav-toggle");
  assert.equal(await nav.isVisible(), true);
  assert.equal(await page.getAttribute("#nav-toggle", "aria-expanded"), "true");
  await nav.getByRole("link", { name: "Catálogo" }).click();
  assert.equal(await nav.isVisible(), false);
  assert.equal(await page.getAttribute("#nav-toggle", "aria-expanded"), "false");
  await page.close();
});

test("FAQ accordion opens one item at a time", async () => {
  const { page } = await openPage();
  const questions = page.locator(".faq-question");
  await questions.nth(0).click();
  await questions.nth(1).click();
  const expanded = await questions.evaluateAll((qs) => qs.map((q) => q.getAttribute("aria-expanded")));
  assert.deepEqual(expanded.slice(0, 2), ["false", "true"]);
  assert.equal(expanded.filter((v) => v === "true").length, 1);
  await page.close();
});

test("internal anchor links resolve to existing ids", async () => {
  const { page } = await openPage();
  const missing = await page.$$eval('a[href^="#"]', (links) =>
    links.map((a) => a.getAttribute("href").slice(1)).filter((id) => id && !document.getElementById(id)),
  );
  assert.deepEqual(missing, []);
  await page.close();
});

test("post template strips a leading $ and flags a missing scene", async () => {
  const page = await browser.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  const template = pathToFileURL(fileURLToPath(new URL("../plantilla/post.html", import.meta.url))).href;
  const params = new URLSearchParams({ nombre: "Prueba", precio: "$25", escena: "file:///no-existe.jpg" });
  await page.goto(`${template}?${params}`);
  await page.waitForFunction(() => window.listo === true);
  assert.equal(await page.textContent("#precio"), "$25");
  assert.equal(await page.evaluate(() => window.escenaRota), true);
  await page.close();
});
