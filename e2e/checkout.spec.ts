import { test, expect, Page } from '@playwright/test';

// ─── Fixtures & helpers ────────────────────────────────────────────────────────

const VALID_PHONE = '0712345678';
const VALID_EMAIL = 'test@example.com';
const VALID_MPESA = '0712345678';
const CHECKOUT_URL = '/checkout';

/** Seed cart state via localStorage before the page loads */
async function seedCart(page: Page, items: object[] = []) {
  const cartItem = items.length
    ? items
    : [
        {
          id: 'tier-test-1',
          tierId: 'tier-test-1',
          eventId: 'event-test-1',
          eventTitle: 'Test Concert',
          ticketType: 'General Admission',
          price: 500,
          quantity: 2,
          currency: 'KES',
          maxPerOrder: 10,
        },
      ];

  await page.addInitScript((items) => {
    localStorage.setItem('lynx-cart', JSON.stringify(items));
  }, cartItem);
}

/** Intercept all Supabase REST calls and the edge function */
async function mockSupabase(page: Page, overrides: {
  stkResult?: object;
  promoResult?: object | null;
  lockResult?: string;
  authUser?: object | null;
} = {}) {
  const {
    stkResult = { success: true, checkoutRequestId: 'ws_CO_TEST_12345' },
    promoResult = null,
    lockResult = 'reservation-uuid-1',
    authUser = { id: 'user-test-1', is_anonymous: true },
  } = overrides;

  // Supabase auth — signInAnonymously
  await page.route('**/auth/v1/signup**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: authUser,
        session: { access_token: 'test-token', token_type: 'bearer' },
      }),
    });
  });

  // Supabase auth — getUser
  await page.route('**/auth/v1/user**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authUser ?? {}),
    });
  });

  // lock_tickets_for_checkout RPC
  await page.route('**/rest/v1/rpc/lock_tickets_for_checkout**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(lockResult),
    });
  });

  // user_profile upsert
  await page.route('**/rest/v1/user_profile**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  // promo_codes lookup
  await page.route('**/rest/v1/promo_codes**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(promoResult !== null ? [promoResult] : []),
    });
  });

  // mpesa-stk-push edge function
  await page.route('**/functions/v1/mpesa-stk-push**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stkResult),
    });
  });

  // Supabase Realtime WebSocket — absorb without failing
  await page.route('**/realtime/v1/**', async (route) => {
    await route.abort();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Checkout — empty cart', () => {
  test('shows empty state with browse link when cart is empty', async ({ page }) => {
    await page.goto(CHECKOUT_URL);
    await expect(page.getByText('Your cart is empty')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Events' })).toBeVisible();
  });
});

test.describe('Checkout — form validation', () => {
  test.beforeEach(async ({ page }) => {
    await seedCart(page);
    await mockSupabase(page);
    await page.goto(CHECKOUT_URL);
    // Wait for the skeleton to resolve
    await page.waitForSelector('input[name="phone"]', { timeout: 10_000 });
  });

  test('shows validation errors when form is submitted empty', async ({ page }) => {
    await page.click('button[type="submit"], button:has-text("Pay")');
    await expect(page.getByText(/valid phone number/i)).toBeVisible();
    await expect(page.getByText(/M-Pesa number required/i)).toBeVisible();
  });

  test('shows error for invalid Kenyan phone format', async ({ page }) => {
    await page.fill('input[name="mpesaNumber"]', '123');
    await page.click('button[type="submit"], button:has-text("Pay")');
    await expect(page.getByText(/M-Pesa number required/i)).toBeVisible();
  });

  test('accepts valid 07XX format for M-Pesa number', async ({ page }) => {
    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    // Validation should not show mpesa error
    await page.click('button[type="submit"], button:has-text("Pay")');
    await expect(page.getByText(/M-Pesa number required/i)).not.toBeVisible();
  });

  test('validates email format when provided', async ({ page }) => {
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    await page.click('button[type="submit"], button:has-text("Pay")');
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('allows checkout without email (optional field)', async ({ page }) => {
    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    await page.click('button[type="submit"], button:has-text("Pay")');
    // Should not show email error
    await expect(page.getByText(/valid email/i)).not.toBeVisible();
  });
});

test.describe('Checkout — happy path', () => {
  test('initiates STK push and enters waiting state', async ({ page }) => {
    await seedCart(page);
    await mockSupabase(page, {
      stkResult: { success: true, checkoutRequestId: 'ws_CO_TEST_99999' },
    });
    await page.goto(CHECKOUT_URL);
    await page.waitForSelector('input[name="phone"]', { timeout: 10_000 });

    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="email"]', VALID_EMAIL);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    await page.click('button[type="submit"], button:has-text("Pay")');

    // Should enter 'waiting' state — look for the spinner/overlay text
    await expect(
      page.getByText(/waiting|check your phone|STK push sent/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('persists checkoutRequestId to sessionStorage on STK success', async ({ page }) => {
    await seedCart(page);
    await mockSupabase(page, {
      stkResult: { success: true, checkoutRequestId: 'ws_CO_SESSION_TEST' },
    });
    await page.goto(CHECKOUT_URL);
    await page.waitForSelector('input[name="phone"]', { timeout: 10_000 });

    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    await page.click('button[type="submit"], button:has-text("Pay")');

    // Wait for waiting state
    await page.waitForFunction(() => sessionStorage.getItem('lynk-x-payment') !== null);

    const stored = await page.evaluate(() => {
      const raw = sessionStorage.getItem('lynk-x-payment');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored?.checkoutId).toBe('ws_CO_SESSION_TEST');
  });

  test('does NOT persist phone number to sessionStorage (PII protection)', async ({ page }) => {
    await seedCart(page);
    await mockSupabase(page, {
      stkResult: { success: true, checkoutRequestId: 'ws_CO_PII_TEST' },
    });
    await page.goto(CHECKOUT_URL);
    await page.waitForSelector('input[name="phone"]', { timeout: 10_000 });

    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    await page.click('button[type="submit"], button:has-text("Pay")');

    await page.waitForFunction(() => sessionStorage.getItem('lynk-x-payment') !== null);

    const stored = await page.evaluate(() => {
      const raw = sessionStorage.getItem('lynk-x-payment');
      return raw ? JSON.parse(raw) : null;
    });
    // Phone must NOT be in sessionStorage
    expect(stored?.phone).toBeUndefined();
    expect(stored?.mpesaNumber).toBeUndefined();
    // Verify the raw string doesn't contain the phone number either
    const raw = await page.evaluate(() => sessionStorage.getItem('lynk-x-payment'));
    expect(raw).not.toContain('071234');
  });
});

test.describe('Checkout — STK push failure', () => {
  test('shows error when edge function returns failure', async ({ page }) => {
    await seedCart(page);
    await mockSupabase(page, {
      stkResult: { success: false, error: 'Payment initiation failed. Please try again.' },
    });
    await page.goto(CHECKOUT_URL);
    await page.waitForSelector('input[name="phone"]', { timeout: 10_000 });

    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    await page.click('button[type="submit"], button:has-text("Pay")');

    await expect(
      page.getByText(/Payment initiation failed|Payment failed/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test('shows error when ticket lock fails (sold out)', async ({ page }) => {
    await seedCart(page);
    await mockSupabase(page);

    // Override the lock RPC to return an error
    await page.route('**/rest/v1/rpc/lock_tickets_for_checkout**', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Tickets unavailable: insufficient stock' }),
      });
    });

    await page.goto(CHECKOUT_URL);
    await page.waitForSelector('input[name="phone"]', { timeout: 10_000 });

    await page.fill('input[name="phone"]', VALID_PHONE);
    await page.fill('input[name="mpesaNumber"]', VALID_MPESA);
    await page.click('button[type="submit"], button:has-text("Pay")');

    await expect(
      page.getByText(/sold out|unavailable|failed to reserve/i)
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Checkout — promo codes', () => {
  test.beforeEach(async ({ page }) => {
    await seedCart(page);
    await mockSupabase(page);
    await page.goto(CHECKOUT_URL);
    await page.waitForSelector('input[name="phone"]', { timeout: 10_000 });
  });

  test('applies a valid percentage promo code', async ({ page }) => {
    // Override promo endpoint for this test
    await page.route('**/rest/v1/promo_codes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'promo-1',
          type: 'percent',
          value: 10,
          is_active: true,
          max_uses: null,
          uses_count: 0,
          valid_from: null,
          valid_until: null,
        }]),
      });
    });

    await page.fill('input[placeholder="Promo code"]', 'SAVE10');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByText(/10%|discount applied/i)).toBeVisible({ timeout: 5_000 });
  });

  test('shows error for invalid promo code', async ({ page }) => {
    await page.fill('input[placeholder="Promo code"]', 'BADCODE');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByText(/not found|invalid/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Checkout — session restore', () => {
  test('restores waiting state from sessionStorage on page reload', async ({ page }) => {
    // Pre-seed a pending checkout in sessionStorage
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'lynk-x-payment',
        JSON.stringify({ checkoutId: 'ws_CO_RESTORE_TEST' })
      );
    });
    await seedCart(page);
    await mockSupabase(page);
    await page.goto(CHECKOUT_URL);

    // Should auto-enter waiting state (restored from sessionStorage)
    await expect(
      page.getByText(/waiting|check your phone|STK push sent/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
