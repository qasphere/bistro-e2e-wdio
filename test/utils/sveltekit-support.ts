import { browser } from '@wdio/globals';

/**
 * SvelteKit Support Module
 *
 * WebDriverIO's built-in waits don't work well with SvelteKit's reactive DOM updates.
 * This module provides SvelteKit-aware helpers using fixed delays and JavaScript execution.
 *
 * Set SK_DEBUG=true environment variable to enable detailed timing logs.
 */

// Basic delay for simple operations (DOM updates, animations)
export const SK_BASIC_DELAY = 100;

// Poll delay for waiting/checking conditions
export const SK_POLL_DELAY = 100;

// Maximum wait time for conditions
export const SK_MAX_WAIT = 5000;

// Debug logging flag
const SK_DEBUG = process.env.SK_DEBUG === 'true';

/**
 * Log debug message if SK_DEBUG is enabled
 */
function skLog(message: string, startTime?: number) {
    if (SK_DEBUG) {
        const elapsed = startTime ? ` [${Date.now() - startTime}ms]` : '';
        console.log(`[SK] ${message}${elapsed}`);
    }
}

/**
 * Basic pause for SvelteKit DOM to settle
 */
export async function skWait() {
    const start = Date.now();
    skLog('skWait: pausing for DOM to settle');
    await browser.pause(SK_BASIC_DELAY);
    skLog('skWait: complete', start);
}

/**
 * Wait for network to be idle (for page loads/navigations)
 * Useful after navigation or initial page load where SvelteKit needs to fetch and hydrate
 */
export async function skWaitForNetworkIdle(timeout: number = 3000) {
    const start = Date.now();
    skLog('skWaitForNetworkIdle: waiting for document.readyState === complete');

    // Wait for document.readyState to be complete
    await browser.waitUntil(
        async () => {
            const readyState = await browser.execute(() => document.readyState);
            return readyState === 'complete';
        },
        {
            timeout,
            interval: 100,
            timeoutMsg: 'Document ready state did not reach "complete"'
        }
    );

    skLog(`skWaitForNetworkIdle: document ready, waiting ${SK_BASIC_DELAY}ms for hydration`);
    // Additional wait for SvelteKit hydration
    await browser.pause(SK_BASIC_DELAY);
    skLog('skWaitForNetworkIdle: complete', start);
}

/**
 * Scroll element into view using JavaScript
 */
export async function skScroll(selector: string, options?: ScrollIntoViewOptions) {
    const start = Date.now();
    skLog(`skScroll: scrolling to "${selector}"`);
    await browser.execute((sel: string, opts?: ScrollIntoViewOptions) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) {
            throw new Error(`Element not found: ${sel}`);
        }
        el.scrollIntoView(opts || { behavior: 'instant', block: 'center', inline: 'center' });
    }, selector, options);
    await browser.pause(100); // Brief pause for scroll to complete
    skLog(`skScroll: complete`, start);
}

/**
 * Click an element using JavaScript (bypasses WebDriver element location issues)
 * Automatically scrolls element into view first
 */
export async function skClick(selector: string) {
    const start = Date.now();
    skLog(`skClick: clicking "${selector}"`);
    await skScroll(selector);
    await browser.execute((sel: string) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) {
            throw new Error(`Element not found: ${sel}`);
        }
        el.click();
    }, selector);
    await skWait();
    skLog(`skClick: complete`, start);
}

/**
 * Set value in an input using JavaScript
 */
export async function skSetValue(selector: string, value: string) {
    const start = Date.now();
    skLog(`skSetValue: setting "${selector}" to "${value}"`);
    await browser.execute((sel: string, val: string) => {
        const el = document.querySelector<HTMLInputElement>(sel);
        if (!el) {
            throw new Error(`Input not found: ${sel}`);
        }
        el.value = val;
        // Trigger input event for Svelte reactivity
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, value);
    await skWait();
    skLog(`skSetValue: complete`, start);
}

/**
 * Select option in a dropdown using JavaScript
 */
export async function skSelectOption(selector: string, optionText: string) {
    const start = Date.now();
    skLog(`skSelectOption: selecting "${optionText}" in "${selector}"`);
    await browser.execute((sel: string, text: string) => {
        const select = document.querySelector<HTMLSelectElement>(sel);
        if (!select) {
            throw new Error(`Select not found: ${sel}`);
        }
        const option = Array.from(select.options).find(opt => opt.text.trim() === text);
        if (!option) {
            throw new Error(`Option "${text}" not found in select ${sel}`);
        }
        select.value = option.value;
        // Trigger change event for Svelte reactivity
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, optionText);
    await skWait();
    skLog(`skSelectOption: complete`, start);
}

/**
 * Wait for an element to exist in the DOM using polling
 */
export async function skWaitForElement(selector: string, timeout: number = SK_MAX_WAIT): Promise<void> {
    const startTime = Date.now();
    skLog(`skWaitForElement: waiting for "${selector}" to exist`);
    let pollCount = 0;

    while (Date.now() - startTime < timeout) {
        const exists = await browser.execute((sel: string) => {
            return document.querySelector(sel) !== null;
        }, selector);

        if (exists) {
            await skWait();
            skLog(`skWaitForElement: found "${selector}" after ${pollCount} polls`, startTime);
            return;
        }

        pollCount++;
        await browser.pause(SK_POLL_DELAY);
    }

    throw new Error(`Element "${selector}" not found within ${timeout}ms`);
}

/**
 * Wait for an element to be visible using polling
 * Handles modals with position:fixed correctly
 */
export async function skWaitForVisible(selector: string, timeout: number = SK_MAX_WAIT): Promise<void> {
    const startTime = Date.now();
    skLog(`skWaitForVisible: waiting for "${selector}" to be visible`);
    let pollCount = 0;

    while (Date.now() - startTime < timeout) {
        const isVisible = await browser.execute((sel: string) => {
            const el = document.querySelector<HTMLElement>(sel);
            if (!el) return false;

            const style = window.getComputedStyle(el);

            // Element must not be hidden
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return false;
            }

            // For fixed/absolute positioned elements (like modals), offsetParent can be null even when visible
            if (style.position === 'fixed' || style.position === 'absolute') {
                return true;
            }

            // For other elements, check offsetParent
            return el.offsetParent !== null;
        }, selector);

        if (isVisible) {
            await skWait();
            skLog(`skWaitForVisible: "${selector}" visible after ${pollCount} polls`, startTime);
            return;
        }

        pollCount++;
        await browser.pause(SK_POLL_DELAY);
    }

    throw new Error(`Element "${selector}" not visible within ${timeout}ms`);
}

/**
 * Wait for a condition to be true using polling
 */
export async function skWaitUntil(
    condition: () => Promise<boolean>,
    timeout: number = SK_MAX_WAIT,
    errorMessage?: string
): Promise<void> {
    const startTime = Date.now();
    skLog(`skWaitUntil: waiting for condition to be true`);
    let pollCount = 0;

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            skLog(`skWaitUntil: condition met after ${pollCount} polls`, startTime);
            return;
        }
        pollCount++;
        await browser.pause(SK_POLL_DELAY);
    }

    throw new Error(errorMessage || `Condition not met within ${timeout}ms`);
}

/**
 * Get text content of an element using JavaScript
 */
export async function skGetText(selector: string): Promise<string> {
    const start = Date.now();
    skLog(`skGetText: reading text from "${selector}"`);
    const text = await browser.execute((sel: string) => {
        const el = document.querySelector(sel);
        return el?.textContent?.trim() ?? '';
    }, selector);
    skLog(`skGetText: got "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, start);
    return text;
}

/**
 * Get multiple texts from elements using JavaScript
 */
export async function skGetAllText(selector: string): Promise<string[]> {
    const start = Date.now();
    skLog(`skGetAllText: reading texts from "${selector}"`);
    const texts = await browser.execute((sel: string) => {
        return Array.from(document.querySelectorAll(sel))
            .map(el => el.textContent?.trim() ?? '');
    }, selector);
    skLog(`skGetAllText: got ${texts.length} items`, start);
    return texts;
}

/**
 * Check if element exists using JavaScript
 */
export async function skExists(selector: string): Promise<boolean> {
    const start = Date.now();
    skLog(`skExists: checking if "${selector}" exists`);
    const exists = await browser.execute((sel: string) => {
        return document.querySelector(sel) !== null;
    }, selector);
    skLog(`skExists: "${selector}" ${exists ? 'exists' : 'does not exist'}`, start);
    return exists;
}

/**
 * Check if element is visible using JavaScript
 * Handles modals with position:fixed correctly
 */
export async function skIsVisible(selector: string): Promise<boolean> {
    const start = Date.now();
    skLog(`skIsVisible: checking if "${selector}" is visible`);
    const visible = await browser.execute((sel: string) => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el) return false;

        const style = window.getComputedStyle(el);

        // Element must not be hidden
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }

        // For fixed/absolute positioned elements (like modals), offsetParent can be null even when visible
        if (style.position === 'fixed' || style.position === 'absolute') {
            return true;
        }

        // For other elements, check offsetParent
        return el.offsetParent !== null;
    }, selector);
    skLog(`skIsVisible: "${selector}" is ${visible ? 'visible' : 'not visible'}`, start);
    return visible;
}
