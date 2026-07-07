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
