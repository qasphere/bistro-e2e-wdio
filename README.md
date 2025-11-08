# E2E Tests for Bistro Delivery (WebDriverIO)

This repository contains end-to-end tests for [Bistro Delivery](https://github.com/hypersequent/bistro), implemented using [WebDriverIO](https://webdriver.io/) with TypeScript.

Prerequisites: Node.js 20+ (with npm)

## Getting Started

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd bistro-e2e-webdriver
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

By default, tests run against `https://hypersequent.github.io/bistro`. To override, create a `.env` file - see `.env.example` for reference.

## Running Tests

### Basic Test Execution

```bash
npm test              # Run tests in headless mode (~10s)
npm run test:headed   # Run tests with browser visible (~11s)
```

Both headless and headed modes have similar performance.

### Code Quality

```bash
npm run typecheck     # Run TypeScript type checking
npm run lint          # Run ESLint
npm run check         # Run both typecheck and lint
```

### Upload testing results to QA Sphere

1. Add your QA Sphere credentials to the `.env` file:

   ```bash
   QAS_TOKEN=<QA Sphere API Token>
   # Get your token in QA Sphere -> Settings -> API Keys

   QAS_URL=<QA Sphere Company URL>
   # Example: https://qasdemo.eu2.qasphere.com
   ```

2. Upload results:

   ```bash
   npx qas-cli junit-upload --attachments junit-results/results-*.xml
   ```

   WebDriverIO generates separate JUnit XML files per worker (e.g., `results-0-0.xml`, `results-0-1.xml`) with test case IDs preserved (BD-023, BD-022, BD-055, BD-026, BD-038, BD-052).

## Test Coverage

The test suite includes 6 test cases mapped to QA Sphere:

**Cart functionality** (`test/specs/cart-simple.e2e.ts`):
- **BD-023**: Product list validation on checkout page
  - URL: https://qasdemo.eu2.qasphere.com/project/BD/tcase/23
- **BD-022**: Order placement with valid data
  - URL: https://qasdemo.eu2.qasphere.com/project/BD/tcase/22

**Content display** (`test/specs/contents.e2e.ts`):
- **BD-055**: About Us page content validation
  - URL: https://qasdemo.eu2.qasphere.com/project/BD/tcase/55
- **BD-026**: Navbar display across pages
  - URL: https://qasdemo.eu2.qasphere.com/project/BD/tcase/26
- **BD-038**: Default menu tab (Pizzas)
  - URL: https://qasdemo.eu2.qasphere.com/project/BD/tcase/38
- **BD-052**: Welcome banner and menu button
  - URL: https://qasdemo.eu2.qasphere.com/project/BD/tcase/52

## Architecture

The project uses the **Page Object Model (POM)** pattern with five main page classes:

- `WelcomePage` - Home page interactions
- `AboutPage` - About Us page content
- `MenuPage` - Menu navigation, tab switching, adding items to cart
- `CartPage` - Cart modal operations (open, close, checkout)
- `CheckoutPage` - Checkout form and order placement

See `CLAUDE.md` for detailed architecture and implementation guidelines.

## Technologies

- **WebDriver.io** v9 - Browser automation framework
- **TypeScript** - Type-safe JavaScript
- **Mocha** - Test framework
- **Zod** - Schema validation for test data
- **ChromeDriver** - Chrome browser automation

## License

This project is licensed under the 0BSD License - see the [LICENSE](LICENSE) file for details.

---

Maintained by [Hypersequent](https://github.com/Hypersequent)
