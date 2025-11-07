# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebDriver.io TypeScript E2E test suite for the Bistro application (SvelteKit). Tests are mapped to QA Sphere test cases (BD-023, BD-022, BD-055, BD-026, BD-038, BD-052) and generate JUnit XML reports for CI/CD integration.

**IMPORTANT**: The application is built with SvelteKit, which has reactive DOM updates incompatible with WebDriverIO's standard element location and waiting mechanisms. Always use the SvelteKit support module (`test/utils/sveltekit-support.ts`) instead of WebDriver's built-in methods.

## Essential Commands

### Running Tests
```bash
npm test                 # Run tests in headless mode (auto-cleans old reports) - ~22-25s
npm run test:headed      # Run tests with browser visible - ~55-65s (slower due to DevTools overhead)
SK_DEBUG=true npm test   # Run with detailed timing logs (helps identify delays)
```

**IMPORTANT**: Headed mode (`--headed`) is **slower** than headless mode due to WebDriver DevTools protocol overhead:
- Headless: ~22-25 seconds
- Headed: ~55-65 seconds (2.5x slower)

In headed mode, the first `browser.execute()` call after page load can take 10-15 seconds due to Chrome UI rendering overhead. This is a known WebDriver limitation, not a test suite issue. Use headed mode only for visual debugging when you need to see the browser UI.

### Code Quality
```bash
npm run typecheck       # Run TypeScript type checking
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run check           # Run both typecheck and lint
```

### Cleanup
```bash
npm run clean           # Remove junit-results/, videos/, screenshots/
```

## Architecture

### Page Object Model (POM) Structure
The test suite uses WebDriver.io's Page Object Model pattern with five main page classes:

- **`WelcomePage`** (`test/pageobjects/welcome.page.ts`)
  - Opens the welcome/home page
  - Retrieves page heading and body content
  - Gets navbar items and active state
  - Gets "View Today's Menu" button text

- **`AboutPage`** (`test/pageobjects/about.page.ts`)
  - Opens the About Us page
  - Retrieves page heading and article content
  - Gets navbar items and active state

- **`MenuPage`** (`test/pageobjects/menu.page.ts`)
  - Handles menu navigation and tab switching (pizza, drinks, desserts)
  - Adds items to cart by index
  - Retrieves menu items with validation via Zod schemas
  - Gets navbar and tab button states

- **`CartPage`** (`test/pageobjects/cart.page.ts`)
  - Opens/closes cart modal
  - Retrieves cart items and total
  - Validates cart data using Zod schemas
  - Navigates to checkout

- **`CheckoutPage`** (`test/pageobjects/checkout.page.ts`)
  - Fills customer name and email
  - Selects payment method
  - Places order
  - Validates order items against cart

### SvelteKit Support Module

**Why it exists:**
WebDriverIO's element location (`$()`, `$$()`) and waiting mechanisms (`waitForDisplayed()`, `waitForClickable()`) fail with SvelteKit's reactive DOM updates. The framework tries to locate elements via WebDriver protocol, which times out due to SvelteKit's dynamic rendering.

**Key challenges solved:**
1. **Element location** - WebDriver protocol can't locate elements during SvelteKit's reactive updates
2. **Network timing** - Page loads and navigations need time for JavaScript bundles to load and SvelteKit to hydrate
3. **Modal visibility** - Fixed/absolute positioned elements need special visibility detection
4. **Form reactivity** - Inputs must dispatch Svelte events (`input`, `change`) to trigger reactivity

**Solution:**
Use JavaScript execution exclusively via the SvelteKit support helpers in `test/utils/sveltekit-support.ts`:

```typescript
import { skClick, skWait, skSetValue, skSelectOption, skScroll, skWaitForVisible } from '../utils/sveltekit-support';

// ❌ NEVER do this with SvelteKit
const button = await $('button');
await button.click();

// ✅ ALWAYS do this instead
await skClick('button');
```

**Available helpers:**
- `skWait()` - Basic 200ms pause for DOM to settle
- `skWaitForNetworkIdle(timeout?)` - Wait for page load/navigation to complete (checks `document.readyState`)
- `skScroll(selector, options?)` - Scroll element into view
- `skClick(selector)` - Click (auto-scrolls first)
- `skSetValue(selector, value)` - Set input/textarea value (triggers Svelte events)
- `skSelectOption(selector, optionText)` - Select dropdown option
- `skWaitForVisible(selector, timeout?)` - Wait for element to be visible (handles modals)
- `skWaitForElement(selector, timeout?)` - Wait for element to exist in DOM
- `skWaitUntil(condition, timeout?, errorMsg?)` - Poll condition
- `skExists(selector)` - Check if element exists
- `skIsVisible(selector)` - Check if element is visible (handles `position:fixed`)
- `skGetText(selector)` - Get element text
- `skGetAllText(selector)` - Get all matching elements' text

**Configuration:**
```typescript
export const SK_BASIC_DELAY = 100;  // DOM updates/animations
export const SK_POLL_DELAY = 100;   // Polling interval
export const SK_MAX_WAIT = 5000;    // Max wait time
```

**Debug Logging:**
Set `SK_DEBUG=true` environment variable to enable detailed timing logs for all SK operations:
```bash
SK_DEBUG=true npm test
```

Example output:
```
[SK] skClick: clicking "button#submit"
[SK] skScroll: scrolling to "button#submit"
[SK] skScroll: complete [210ms]
[SK] skWait: pausing for DOM to settle
[SK] skWait: complete [200ms]
[SK] skClick: complete [468ms]
[SK] skWaitForNetworkIdle: waiting for document.readyState === complete
[SK] skWaitForNetworkIdle: complete [328ms]
```

This helps identify:
- Which operations take the most time
- How many polls are needed for wait operations
- Network delays during page loads and navigation
- Overall timing breakdown of test execution

**Key patterns:**
```typescript
// Network-aware page load (initial page or after navigation)
await browser.url('/');
await skWaitForNetworkIdle(); // Wait for page to fully load and hydrate

// Navigation with network wait
await skClick('#checkout-link');
await browser.waitUntil(async () => (await browser.getUrl()).includes('checkout'));
await skWaitForNetworkIdle(); // Wait for new page to hydrate before interacting

// Clicking with auto-scroll
await skClick('#submit-button');

// Form filling
await skSetValue('#email', 'test@example.com');
await skSelectOption('#country', 'United States');

// Modal visibility (handles position:fixed correctly)
await skWaitForVisible('#cart-modal');

// Custom waits
await skWaitUntil(async () => {
  const count = await skGetText('#cart-count');
  return count === '3';
}, 3000, 'Cart count did not reach 3');
```

### WebDriverIO-Specific Patterns

**ChainablePromiseArray Handling:**
WebDriverIO's `$$()` returns a special `ChainablePromiseArray` type that doesn't work well with `.map()` and `Promise.all()`. Use for-of loops instead:

```typescript
// ❌ Avoid - causes TypeScript errors
const items = await Promise.all(
  elements.map(async (el) => await el.getText())
);

// ✅ Correct approach
const items = [];
for (const el of elements) {
  items.push(await el.getText());
}
```

**IMPORTANT:** Prefer `browser.execute()` with the SvelteKit helpers over WebDriver element methods.

### Configuration (`wdio.conf.ts`)

**Headed Mode Detection:**
The `--headed` flag is detected via `process.argv` to toggle Chrome's headless mode and timeout:
```typescript
const headless = !process.argv.includes("--headed");

// Headed mode has longer timeout due to DevTools protocol overhead
timeout: headless ? 60000 : 180000  // 60s headless, 180s headed
```

Chrome flags reduce DevTools overhead in headed mode:
- `--disable-extensions` - No extension loading
- `--disable-infobars` - No Chrome infobars
- `--disable-browser-side-navigation` - Reduce navigation overhead

**Critical JUnit Reporter Config:**
The `suiteNameFormat` regex preserves test case IDs (BD-023, BD-022) in reports:
```typescript
suiteNameFormat: /[^a-zA-Z0-9@\-:]+/  // Keep alphanumeric, @, dash, colon
```
**Do not remove or modify this** - it ensures QA Sphere test case mappings remain intact in CI/CD systems.

**Screenshot & Video Recording:**
- Screenshots captured on failure via `afterTest` hook
- Videos only recorded for failed tests (`saveAllVideos: false`)
- Both automatically cleaned before each test run

### Test Specifications

Tests are organized into two spec files:

**`test/specs/cart-simple.e2e.ts`** - Cart and checkout functionality:
- BD-023: Product list validation on checkout page
- BD-022: Order placement with valid data

**`test/specs/contents.e2e.ts`** - Content display and navigation:
- BD-055: About Us page content validation
- BD-026: Navbar display across pages
- BD-038: Default menu tab (Pizzas)
- BD-052: Welcome banner and menu button

Tests follow this naming convention:
```typescript
it('BD-023: User should see product list according the cart on the Checkout page', async () => {
  // Test case: https://qasdemo.eu2.qasphere.com/project/BD/tcase/23
  // ...
});
```

**Test Isolation:**
An `afterEach` hook closes the cart modal if open to prevent "element click intercepted" errors between tests.

### Zod Schema Validation

Price parsing and cart item validation use Zod schemas defined in page objects:
```typescript
export const PriceSchema = z
  .string()
  .regex(/^\$\d+$/)
  .transform((val) => Number.parseInt(val.slice(1), 10));

export const CartItemSchema = z.object({
  name: z.string().min(1),
  amount: PriceSchema,
});
```

## Environment Setup

Required `.env` file:
```
DEMO_BASE_URL=https://hypersequent.github.io/bistro/
```

The config will throw an error if `DEMO_BASE_URL` is not set.

## TypeScript Configuration

- Strict mode enabled
- WebDriverIO globals (`browser`, `$`, `$$`, `expect`) imported from `@wdio/globals`
- No explicit type annotation on `config` export in `wdio.conf.ts` (WebDriverIO types can be overly strict)

## ESLint Configuration

Uses ESLint v9 flat config (`eslint.config.mjs`):
- Ignores `ref-playwright-not-commit/` reference directory
- Allows unused vars prefixed with `_`
- WebDriverIO globals declared

## Known Issues & Solutions

**TypeScript Errors with `Options.Testrunner`:**
Do not add explicit type annotation to the config export - it causes false positives with the `capabilities` field.

**Element Click Intercepted:**
Ensure `afterEach` hook closes modals and use `waitForClickable()` before clicking.

**Scroll Errors:**
Use JavaScript scrollIntoView, not WebDriver Actions API.

## CI/CD Integration

JUnit XML reports are generated in `junit-results/results-{cid}.xml` with:
- Separate file per worker to avoid overwrites during parallel execution (e.g., `results-0-0.xml`, `results-0-1.xml`)
- Test case IDs preserved (BD-023, BD-022, BD-055, BD-026, BD-038, BD-052)
- Special chars (`:`, `"`) stripped by XML encoding (expected behavior)
- `<system-out>` contains WebDriver commands (standard for WebDriverIO JUnit reporter)
