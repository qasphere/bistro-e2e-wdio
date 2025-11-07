import { browser } from '@wdio/globals';

/**
 * Screenshot Support Module
 *
 * Generic WebDriverIO screenshot helpers for debugging test failures.
 * These functions work with any WebDriverIO project, not specific to SvelteKit.
 */

/**
 * Capture screenshot at a specific point in the test
 * Useful for debugging assertions - captures exact state before expect()
 *
 * @param label - Descriptive label for the screenshot (e.g., "before-heading-check")
 * @returns Path to the saved screenshot
 */
export async function captureScreenshot(label: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedLabel = label.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `./screenshots/${sanitizedLabel}_${timestamp}.png`;

    try {
        const fs = await import('fs/promises');
        await fs.mkdir('./screenshots', { recursive: true });
        await browser.saveScreenshot(filename);
        console.log(`[Screenshot] ${filename}`);
        return filename;
    } catch (error) {
        console.error(`[Screenshot] FAILED to capture "${label}":`, error);
        throw error;
    }
}

/**
 * Execute an assertion with automatic screenshot capture on failure
 * Captures screenshot BEFORE running the assertion, so you always have the exact state
 *
 * @param label - Descriptive label for the screenshot (e.g., "heading-check")
 * @param assertion - Assertion function to execute (e.g., () => expect(value).toBe(expected))
 * @returns Path to screenshot if assertion failed, undefined if passed
 *
 * @example
 * const heading = await AboutPage.getHeading();
 * await expectWithScreenshot("heading-check", () => {
 *   expect(heading).toBe("Welcome to Bistro Delivery");
 * });
 */
export async function expectWithScreenshot(
    label: string,
    assertion: () => void | Promise<void>
): Promise<string | undefined> {
    // Capture screenshot BEFORE assertion
    const screenshotPath = await captureScreenshot(label);

    try {
        // Run the assertion
        await assertion();
        return undefined;
    } catch (error) {
        // Assertion failed - screenshot already captured
        console.log(`[Assertion Failed] Screenshot: ${screenshotPath}`);
        throw error;
    }
}
