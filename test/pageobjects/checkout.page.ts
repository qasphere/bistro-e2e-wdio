import { browser, expect } from '@wdio/globals';
import { CartResponseSchema } from './cart.page';
import { skWait, skSetValue, skSelectOption, skClick, skWaitForElement } from '../utils/sveltekit-support';

export const paymentMethods = ['Cash on Delivery', 'Card Payment on Delivery'];

export class CheckoutPage {
    async getOrderItems() {
        const SK_DEBUG = process.env.SK_DEBUG === 'true';
        const overallStart = Date.now();

        if (SK_DEBUG) console.log('[SK] getOrderItems: starting');

        const currentUrl = await browser.getUrl();
        if (SK_DEBUG) console.log(`[SK] getOrderItems: got URL [${Date.now() - overallStart}ms]`);

        expect(currentUrl).toContain('checkout');

        // Wait for SvelteKit to render
        await skWait();

        // Direct read using JavaScript
        if (SK_DEBUG) console.log(`[SK] getOrderItems: executing browser.execute [${Date.now() - overallStart}ms]`);
        const executeStart = Date.now();
        const data = await browser.execute(() => {
            const rows = Array.from(document.querySelectorAll('table > tbody > tr'));

            const items = rows.slice(0, Math.max(rows.length - 1, 0)).map((row) => {
                const name = row.querySelector('td:nth-child(2)')?.textContent?.trim() ?? '';
                const amount = row.querySelector('td:nth-child(4)')?.textContent?.trim() ?? '';
                return { name, amount };
            });

            const total =
                rows.length > 0
                    ? rows[rows.length - 1].querySelector('td:nth-child(4)')?.textContent?.trim() ?? ''
                    : '';

            return { items, total };
        });
        if (SK_DEBUG) console.log(`[SK] getOrderItems: browser.execute complete [${Date.now() - executeStart}ms]`);

        if (SK_DEBUG) console.log(`[SK] getOrderItems: parsing schema [${Date.now() - overallStart}ms]`);
        const result = CartResponseSchema.parse(data);
        if (SK_DEBUG) console.log(`[SK] getOrderItems: complete [${Date.now() - overallStart}ms]`);

        return result;
    }

    async fillName(name: string) {
        await skSetValue('#customerName', name);
    }

    async fillEmail(email: string) {
        await skSetValue('#customerAddress', email);
    }

    async selectPaymentMethod(method: string) {
        await skSelectOption('#paymentMethod', method);
    }

    async getPaymentMethodOptions() {
        const SK_DEBUG = process.env.SK_DEBUG === 'true';
        const overallStart = Date.now();

        if (SK_DEBUG) console.log('[SK] getPaymentMethodOptions: starting');

        // Wait for SvelteKit to render the select element
        await skWaitForElement('#paymentMethod');

        if (SK_DEBUG) console.log(`[SK] getPaymentMethodOptions: executing browser.execute [${Date.now() - overallStart}ms]`);
        const executeStart = Date.now();
        const optionTexts = await browser.execute(() => {
            const select = document.querySelector<HTMLSelectElement>('#paymentMethod');
            if (!select) {
                return [];
            }
            return Array.from(select.options).map(opt => opt.text.trim());
        });
        if (SK_DEBUG) console.log(`[SK] getPaymentMethodOptions: browser.execute complete [${Date.now() - executeStart}ms]`);
        if (SK_DEBUG) console.log(`[SK] getPaymentMethodOptions: complete [${Date.now() - overallStart}ms]`);

        return optionTexts;
    }

    async placeOrder() {
        await skClick('form button[type="submit"]');
    }
}

export default new CheckoutPage();
