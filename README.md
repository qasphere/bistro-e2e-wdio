# E2E Tests for Bistro Delivery (WebDriverIO)

This repository contains end-to-end tests for [Bistro Delivery](https://github.com/hypersequent/bistro), implemented using [WebDriverIO](https://webdriver.io/) with TypeScript.

This is an example automation testing integration project for [QA Sphere](https://qasphere.com/)

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
npm test              # Run tests in headless mode
npm run test:headed   # Run tests with browser visible
```

Tests typically complete in around 12 seconds.

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
   npm run junit-upload
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

## Technologies

- **WebDriver.io** v9 - Browser automation framework
- **TypeScript** - Type-safe JavaScript
- **Mocha** - Test framework
- **Zod** - Schema validation for test data
- **ChromeDriver** - Chrome browser automation

## Implementation Details

### JUnit Upload Command

This project includes a convenient npm script for uploading test results to QA Sphere. The command is defined in `package.json`:

```json
"junit-upload": "npx qas-cli junit-upload --attachments --skip-report-stdout on-success junit-results/results-*.xml"
```

**Why this approach?**

- **No version pinning**: Using `npx qas-cli` (without `@version`) ensures you always get the latest version of the QA Sphere CLI tool
- **Convenience**: A simple `npm run junit-upload` is easier to remember and type than the full command
- **CI/CD friendly**: The script can be easily integrated into GitHub Actions, GitLab CI, or other CI/CD pipelines
- **Team consistency**: Everyone on the team runs the same command with the same flags

**Command breakdown:**

- `--attachments`: Automatically uploads screenshots from failed tests
- `--skip-report-stdout on-success`: Hides verbose JUnit report output for passing tests, keeping QA Sphere test results cleaner
- `junit-results/results-*.xml`: Uploads all JUnit XML files (WebDriverIO generates one per worker)

**Adopting in your project:**

To use a similar approach in your WebDriverIO project:

1. Add the script to your `package.json`:
   ```json
   "scripts": {
     "junit-upload": "npx qas-cli junit-upload --attachments --skip-report-stdout on-success junit-results/results-*.xml"
   }
   ```

2. Configure your JUnit reporter in `wdio.conf.ts` to preserve test case IDs:
   ```typescript
   reporters: [
     ['junit', {
       outputDir: './junit-results',
       outputFileFormat: (options) => `results-${options.cid}.xml`,
       suiteNameFormat: /[^a-zA-Z0-9@\-:]+/  // Keeps alphanumeric, @, dash, colon
     }]
   ]
   ```

3. Ensure your test names include the test case ID:
   ```typescript
   it('BD-023: User should see product list on checkout page', async () => {
     // Test implementation
   });
   ```

### Screenshot Attachments

This project implements automatic screenshot attachment to JUnit XML reports for failed tests. The implementation is in `wdio.conf.ts` using the `afterTest` hook.

**How it works:**

1. **Automatic capture**: When a test fails, the `afterTest` hook captures a final screenshot
2. **Multiple screenshots**: Collects all screenshots matching the test name prefix (including any taken during the test)
3. **JUnit XML embedding**: Attaches screenshots using the `[[ATTACHMENT|path]]` format that QA Sphere CLI recognizes
4. **Pattern matching**: Matches screenshots by:
   - Test name prefix (normalized: `BD_023_User_should_see_product_list...`)
   - Test case ID (e.g., `BD-055`)

**Key implementation details:**

```typescript
afterTest: async function (test, context, { error, passed }) {
  if (!passed) {
    // 1. Normalize test name for file matching
    const testNamePrefix = test.title
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .substring(0, 50);

    // 2. Take final screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const finalScreenshot = `./screenshots/${testNamePrefix}_afterTest_${timestamp}.png`;
    await browser.saveScreenshot(finalScreenshot);

    // 3. Find all matching screenshots (including inline ones)
    const screenshotFiles = await fs.readdir("./screenshots");
    const matchingScreenshots = screenshotFiles.filter((file) => {
      const testCaseMatch = test.title.match(/^(BD-\d+)/);
      const testCaseId = testCaseMatch ? testCaseMatch[1] : null;
      return file.startsWith(testNamePrefix) || (testCaseId && file.includes(testCaseId));
    });

    // 4. Attach to JUnit XML via error message
    if (error && matchingScreenshots.length > 0) {
      const attachments = matchingScreenshots
        .map((file) => `[[ATTACHMENT|${file}]]`)
        .join("\n");
      error.message = `${error.message}\n\n${attachments}`;
    }
  }
}
```

**Why this approach?**

- **Zero configuration**: Works automatically for all tests without extra code
- **Multiple screenshots**: Supports both automatic (afterTest) and manual screenshots taken during tests
- **QA Sphere integration**: The `[[ATTACHMENT|path]]` format is recognized by `qas-cli junit-upload --attachments`
- **Pattern flexibility**: Matches screenshots by test name or test case ID for robust detection

**Adopting screenshot attachments:**

To implement this in your WebDriverIO project, add the `afterTest` hook shown above to your `wdio.conf.ts`. Make sure to:
- Create the `./screenshots` directory if it doesn't exist
- Use consistent test naming with test case IDs at the start (e.g., `BD-023: Description`)
- Run `npm run junit-upload` with the `--attachments` flag to upload screenshots to QA Sphere

**Testing the screenshot attachment system:**

To verify that both manual and automatic screenshots are attached to JUnit XML reports, run the BD-055 test with the `BROKEN_TEST` flag:

```bash
BROKEN_TEST=1 npm test -- --spec=test/specs/contents.e2e.ts --mochaOpts.grep="BD-055"
```

This will:
1. Take a manual screenshot during the test (`BD-055_manual_before_check.png`)
2. Intentionally fail the test to trigger the `afterTest` hook
3. Capture an automatic screenshot (`BD_055_..._afterTest_....png`)
4. Attach both screenshots to the JUnit XML report

Check `junit-results/results-*.xml` to see both `[[ATTACHMENT|...]]` markers in the failure message, confirming that manual screenshots taken during tests are collected alongside automatic ones.

**Known limitation:**

This approach only works for **failed tests** because it embeds screenshot paths in the error message. JUnit XML doesn't provide a standard way to attach files to successful tests - the `<error>` or `<failure>` elements are required to include the attachment metadata.

## License

This project is licensed under the 0BSD License - see the [LICENSE](LICENSE) file for details.

Maintained by Hypersequent for [QA Sphere](https://qasphere.com/)
