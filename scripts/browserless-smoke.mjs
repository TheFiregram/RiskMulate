import puppeteer from "puppeteer-core";

const token = process.env.BROWSERLESS_TOKEN;

if (!token) {
  console.error("Missing BROWSERLESS_TOKEN environment variable.");
  process.exit(1);
}

const browser = await puppeteer.connect({
  browserWSEndpoint: `wss://production-sfo.browserless.io?token=${encodeURIComponent(token)}`,
});

try {
  const page = await browser.newPage();
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  const title = await page.title();
  console.log(`Browserless connected successfully. Page title: ${title}`);
} finally {
  await browser.close();
}
