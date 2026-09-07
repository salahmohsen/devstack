#!/usr/bin/env node
// Screenshot a web page, a section, a specific element, or the viewport — using
// headless Chrome. Drives the locally-installed Google Chrome via playwright-core
// (no bundled-browser download). Prints the saved PNG path on the last stdout line.
//
// Usage:
//   node screenshot.mjs --url <url> [target] [render] [browser] [output]
//
// TARGET — what to capture (pick at most one; --selector wins if several given):
//   (none)               The current viewport (above-the-fold).
//   --full-page          The entire scrollable page.
//   --selector <css>     One exact element (button, nav, card, .hero, #footer …).
//   --section  <value>   Smart match, resolved in this order:
//                          1. integer N  -> the Nth <section> (1-based)
//                          2. CSS-looking -> used as a selector (starts with . # [ or has > ~)
//                          3. otherwise   -> heading text; captures the enclosing
//                                            <section>/<article>/<main> (or --container)
//   --container <css>    When matching by heading text, capture this ancestor instead.
//
// RENDER:
//   --device <name>  Preset: mobile | tablet | desktop (sets width/height/scale).
//   --width  <px>    Viewport width        (default 1280)
//   --height <px>    Viewport height       (default 800)
//   --scale  <n>     Device scale factor   (default 2, crisp retina output)
//   --wait   <v>     Extra wait before shot: integer ms, or a CSS selector to await.
//   --pad    <px>    Padding around a section/element clip (default 0)
//
// BROWSER:
//   --channel <name> chrome | msedge | chromium  (default chrome)
//   --headed         Show the browser window (default headless)
//   --cdp <wsUrl>    Attach to an already-running Chrome via CDP instead of launching
//                    one. Reuses that browser's cookies/session (logged-in pages).
//
// OUTPUT:
//   --out <path>     Where to write the PNG (default: system temp dir, timestamped).

import { chromium, devices } from 'playwright-core';
import os from 'node:os';
import path from 'node:path';

// width/height/scale presets for --device. Explicit --width/--height/--scale override.
const DEVICE_PRESETS = {
  mobile: { width: 390, height: 844, scale: 3, isMobile: true },
  tablet: { width: 820, height: 1180, scale: 2, isMobile: true },
  desktop: { width: 1280, height: 800, scale: 2, isMobile: false },
};

function parseArgs(argv) {
  const flags = new Set(['--full-page', '--headed']);
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (flags.has(a)) { out[a.slice(2)] = true; continue; }
    if (a.startsWith('--')) { out[a.slice(2)] = argv[++i]; continue; }
    out._.push(a);
  }
  return out;
}

function safeSlug(s) {
  return (s || 'page').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'page';
}

function defaultOutPath(url, label) {
  const host = (() => { try { return new URL(url).hostname; } catch { return 'page'; } })();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(os.tmpdir(), `${safeSlug(host)}__${safeSlug(label)}__${stamp}.png`);
}

function looksLikeSelector(v) {
  return /^[.#\[]/.test(v) || /[>~]/.test(v) || /^[a-zA-Z][\w-]*[.#\[]/.test(v);
}

async function resolveTarget(page, { selector, section, container }) {
  if (selector) return { locator: page.locator(selector).first(), how: `element "${selector}"` };
  if (section == null || section === '') return null; // page-level capture

  if (/^\d+$/.test(String(section))) {
    const idx = parseInt(section, 10) - 1;
    return { locator: page.locator('section').nth(idx), how: `section #${section}` };
  }
  if (looksLikeSelector(String(section))) {
    return { locator: page.locator(String(section)).first(), how: `element "${section}"` };
  }

  // Heading-text match -> enclosing block.
  const heading = page.getByRole('heading', { name: String(section), exact: false }).first();
  if (await heading.count()) {
    if (container) {
      const c = page.locator(container, { has: heading }).first();
      if (await c.count()) return { locator: c, how: `heading "${section}" inside "${container}"` };
    }
    const sectionAncestor = heading.locator('xpath=ancestor-or-self::*[self::section or self::article or self::main][1]');
    if (await sectionAncestor.count()) return { locator: sectionAncestor.first(), how: `section containing heading "${section}"` };
    return { locator: heading.locator('xpath=..'), how: `parent block of heading "${section}"` };
  }

  // Last resort: any element whose text matches.
  const byText = page.getByText(String(section), { exact: false }).first();
  if (await byText.count()) {
    const anc = byText.locator('xpath=ancestor-or-self::*[self::section or self::article][1]');
    if (await anc.count()) return { locator: anc.first(), how: `section containing text "${section}"` };
  }
  throw new Error(`Could not find anything matching "${section}". Try --selector "<css>" for an exact element, or --section <N> for the Nth <section>.`);
}

async function applyWait(page, wait) {
  if (!wait) return;
  if (/^\d+$/.test(String(wait))) { await page.waitForTimeout(parseInt(wait, 10)); return; }
  await page.waitForSelector(String(wait), { timeout: 15000 }).catch(() => {});
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.url || a.help || a.h) {
    console.error('Required: --url <url>. See the file header for all options.');
    process.exit(a.url ? 0 : 2);
  }

  const dev = a.device ? DEVICE_PRESETS[String(a.device).toLowerCase()] : null;
  if (a.device && !dev) {
    console.error(`Unknown --device "${a.device}". Use: mobile | tablet | desktop.`);
    process.exit(2);
  }
  const width = parseInt(a.width || (dev && dev.width) || 1280, 10);
  const height = parseInt(a.height || (dev && dev.height) || 800, 10);
  const scale = parseFloat(a.scale || (dev && dev.scale) || 2);
  const isMobile = dev ? dev.isMobile : false;
  const channel = a.channel || 'chrome';
  const label = a.selector || a.section || (a['full-page'] ? 'full' : (a.device || 'viewport'));
  const outPath = a.out || defaultOutPath(a.url, label);

  let browser, context, ownsBrowser = true;
  try {
    const ctxOpts = { viewport: { width, height }, deviceScaleFactor: scale };
    if (isMobile) {
      ctxOpts.isMobile = true;
      ctxOpts.hasTouch = true;
      if (devices['iPhone 13']) ctxOpts.userAgent = devices['iPhone 13'].userAgent;
    }

    if (a.cdp) {
      browser = await chromium.connectOverCDP(String(a.cdp));
      ownsBrowser = false;
      context = browser.contexts()[0] || await browser.newContext(ctxOpts);
    } else {
      try {
        browser = await chromium.launch({ channel, headless: !a.headed });
      } catch (e) {
        throw new Error(
          `Failed to launch Chrome (channel "${channel}"). Install Google Chrome, or run ` +
          `"npx playwright install chromium" in the skill's scripts/ folder and pass --channel chromium.\n` +
          `Underlying error: ${e.message}`
        );
      }
      context = await browser.newContext(ctxOpts);
    }

    const page = context.pages()[0] || await context.newPage();
    await page.setViewportSize({ width, height }).catch(() => {});
    await page.goto(String(a.url), { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
      // networkidle can hang on sites with long-polling; fall back to load.
      await page.goto(String(a.url), { waitUntil: 'load', timeout: 45000 });
    });
    await applyWait(page, a.wait);

    let target = null;
    if (!a['full-page']) {
      target = await resolveTarget(page, { selector: a.selector, section: a.section, container: a.container });
    }

    let how;
    if (target) {
      const el = target.locator;
      if (!(await el.count())) throw new Error(`Matched 0 elements for ${target.how}.`);
      await el.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
      const pad = parseInt(a.pad || '0', 10);
      const box = pad > 0 ? await el.boundingBox() : null;
      if (box) {
        await page.screenshot({
          path: outPath,
          clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 },
        });
      } else {
        await el.screenshot({ path: outPath });
      }
      how = target.how;
    } else {
      await page.screenshot({ path: outPath, fullPage: !!a['full-page'] });
      how = a['full-page'] ? 'full page' : 'viewport';
    }

    const dims = `${width}x${height}${dev ? ` (${a.device})` : ''} @${scale}x`;
    console.error(`Captured ${how} of ${a.url} — ${dims}`);
    console.error(`Saved:  ${outPath}`);
    console.error(`Open:   file://${outPath}`); // cmd/ctrl-clickable in most terminals
    console.log(outPath); // last stdout line = the full absolute PNG path
  } catch (err) {
    console.error(`screenshot error: ${err.message}`);
    process.exit(1);
  } finally {
    try { if (context && ownsBrowser) await context.close(); } catch {}
    try { if (browser && ownsBrowser) await browser.close(); } catch {}
  }
}

main();
