# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WebDriver.io TypeScript E2E test suite for the Bistro application. Tests are mapped to QA Sphere test cases (BD-023, BD-022, BD-055, BD-026, BD-038, BD-052) and generate JUnit XML reports for CI/CD integration.

## Essential Commands

### Running Tests
```bash
npm test                 # Run tests in headless mode (auto-cleans old reports) - ~10s
npm run test:headed      # Run tests with browser visible - ~11s
```

Both headless and headed modes have similar performance (~10-11 seconds).

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

### WebDriverIO Patterns

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

**Standard WebDriverIO Methods:**
Use standard WebDriverIO element methods like `$()`, `$$()`, `click()`, `setText()`, `waitForDisplayed()` etc. They work well with the application.

### Configuration (`wdio.conf.ts`)

**Headed Mode Detection:**
The `--headed` flag is detected via `process.argv` to toggle Chrome's headless mode:
```typescript
const headless = !process.argv.includes("--headed");
```

Chrome flags improve performance in headed mode:
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

Optional `.env` file:
```
DEMO_BASE_URL=https://hypersequent.github.io/bistro/
```

By default, tests run against `https://hypersequent.github.io/bistro`. Create a `.env` file to override the base URL.

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
