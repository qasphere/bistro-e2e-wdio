import "dotenv/config";

// Default to Bistro demo site if DEMO_BASE_URL is not set
if (typeof process.env.DEMO_BASE_URL === "undefined") {
  process.env.DEMO_BASE_URL = "https://hypersequent.github.io/bistro";
}

// Ensure DEMO_BASE_URL does NOT have a trailing slash
process.env.DEMO_BASE_URL = process.env.DEMO_BASE_URL.replace(/\/+$/, "");

const headless = !process.argv.includes("--headed");

export const config = {
  runner: "local",
  tsConfigPath: "./tsconfig.json",

  specs: ["./test/specs/**/*.ts"],

  exclude: [],

  maxInstances: 1,

  capabilities: [
    {
      browserName: "chrome",
      "goog:chromeOptions": {
        args: headless
          ? [
              "--headless",
              "--disable-gpu",
              "--window-size=1920,1080",
              "--disable-dev-shm-usage",
              "--no-sandbox",
            ]
          : [
              "--window-size=1920,1080",
              "--disable-dev-shm-usage",
              "--no-sandbox",
              // Reduce DevTools protocol overhead in headed mode
              "--disable-extensions",
              "--disable-infobars",
              "--disable-browser-side-navigation",
            ],
      },
    },
  ],

  logLevel: "warn",

  bail: 0,

  baseUrl: process.env.DEMO_BASE_URL,

  waitforTimeout: 10000,

  connectionRetryTimeout: 120000,

  connectionRetryCount: 3,

  // Screenshot on failure - must run IMMEDIATELY before browser state changes
  afterTest: async function (
    test: any,
    context: unknown,
    {
      error,
      passed,
    }: {
      error?: any;
      result?: unknown;
      duration?: number;
      passed?: boolean;
      retries?: unknown;
    },
  ) {
    if (!passed) {
      const fs = await import("fs/promises");
      const path = await import("path");

      // Normalize test name for prefix matching (same logic as skScreenshot)
      const testNamePrefix = test.title
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .substring(0, 50);

      try {
        await fs.mkdir("./screenshots", { recursive: true });

        // Take final screenshot from afterTest hook
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const finalScreenshot = `./screenshots/${testNamePrefix}_afterTest_${timestamp}.png`;
        await browser.saveScreenshot(finalScreenshot);

        // Collect all screenshots matching test prefix (including inline screenshots)
        const screenshotFiles = await fs.readdir("./screenshots");
        const matchingScreenshots = screenshotFiles
          .filter((file) => {
            // Match files that start with test name prefix or contain test case ID (e.g., BD-055)
            const testCaseMatch = test.title.match(/^(BD-\d+)/);
            const testCaseId = testCaseMatch ? testCaseMatch[1] : null;

            return (
              file.startsWith(testNamePrefix) ||
              (testCaseId && file.includes(testCaseId))
            );
          })
          .map((file) => path.join("./screenshots", file));

        // Attach all matching screenshots to JUnit XML
        if (error && error.message && matchingScreenshots.length > 0) {
          const attachments = matchingScreenshots
            .map((file) => `[[ATTACHMENT|${file}]]`)
            .join("\n");
          error.message = `${error.message}\n\n${attachments}`;

          console.log(
            `[JUnit] Attached ${matchingScreenshots.length} screenshot(s) to test report`,
          );
        }
      } catch (screenshotError) {
        console.error("Failed to capture screenshot:", screenshotError);
      }
    }
  },

  services: [],

  framework: "mocha",

  reporters: [
    "spec",
    [
      "json",
      {
        outputDir: "./json-results",
        outputFileFormat: function (options: any) {
          const specFileName = options.cid.replace(/:/g, "-");
          return `results-${specFileName}.json`;
        },
      },
    ],
    [
      "junit",
      {
        outputDir: "./junit-results",
        outputFileFormat: function (options: any) {
          // Generate unique filename per spec file to avoid overwrites with parallel execution
          const specFileName = options.cid.replace(/:/g, "-");
          return `results-${specFileName}.xml`;
        },
        suiteNameFormat: /[^a-zA-Z0-9@\-:]+/, // Keep alphanumeric, @, dash, and colon
        addFileAttribute: true,
        errorOptions: {
          failure: "message",
          stacktrace: "stack",
        },
        addWorkerLogs: false,
        // Note: <system-out> contains WebDriver commands - this is standard WebDriverIO behavior
        // CI/CD systems typically ignore or collapse this section
      },
    ],
    // Video reporter disabled - screenshots provide sufficient debugging info
    // [
    //   "video",
    //   {
    //     saveAllVideos: false, // Only save videos for failed tests
    //     videoSlowdownMultiplier: 3, // Higher = slower videos, easier to see what happened
    //     outputDir: "./videos",
    //   },
    // ],
  ],

  mochaOpts: {
    ui: "bdd",
    // Headed mode has significant DevTools protocol overhead (browser.execute() can take 10-30s)
    // Use longer timeout in headed mode for visual debugging
    timeout: headless ? 60000 : 180000,
  },
};
