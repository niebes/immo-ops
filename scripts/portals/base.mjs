// Shared helpers for portal extractors.

const CONSENT_SELECTORS = [
  'button:has-text("Alle akzeptieren")',
  'button:has-text("Alle Cookies akzeptieren")',
  'button:has-text("Akzeptieren")',
  'button:has-text("Zustimmen")',
  'button:has-text("Accept all")',
  'button:has-text("Alle Cookies zulassen")',
  '[data-testid="consent-accept-all"]',
  '#onetrust-accept-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', // Cookiebot (e.g. Vonovia)
  '#CybotCookiebotDialogBodyButtonAccept',
];

export async function handleCookieConsent(page) {
  for (const sel of CONSENT_SELECTORS) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await page.waitForTimeout(1000);
        return true;
      }
    } catch { /* try next */ }
  }
  return false;
}

export function isCaptcha(text) {
  return text.includes('Ich bin kein Roboter')
    || text.includes('captcha')
    || text.includes('Are you a robot');
}

// Walls with no visible text, only an embedded challenge (DataDome's
// geo.captcha-delivery.com iframe). Mirrors invisible-driver.py BLOCK_HTML_MARKERS.
const BLOCK_HTML_MARKERS = ['captcha-delivery.com'];

// Page-level bot-wall check, mirroring invisible-driver.py is_blocked(): title, then the
// VISIBLE body text, then HTML-only markers. Never textContent — it includes <script>
// source, so a contact form's reCAPTCHA loader (Semmelhaack) or a plugin config like
// "usecaptcha":"no" (BBG) read as a CAPTCHA on a fully loaded page (2026-10-27).
export async function isBlockedPage(page) {
  try {
    if (isCaptcha((await page.title()) || '')) return true;
    if (isCaptcha((await page.innerText('body')).slice(0, 4000))) return true;
    const html = await page.content();
    return BLOCK_HTML_MARKERS.some(m => html.includes(m));
  } catch {
    return false;
  }
}

export function parseNumber(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function extractPattern(text, regex) {
  const match = (text || '').match(regex);
  return match ? (match[1] || match[2]) : null;
}
