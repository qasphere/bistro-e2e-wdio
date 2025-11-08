import { browser, expect, $ } from '@wdio/globals';
import { CartResponseSchema } from './cart.page';

export const paymentMethods = ['Cash on Delivery', 'Card Payment on Delivery'];

export class CheckoutPage {
    async getOrderItems() {
        const currentUrl = await browser.getUrl();
        expect(currentUrl).toContain('checkout');

        // Direct read using JavaScript
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

        return CartResponseSchema.parse(data);
    }

    async fillName(name: string) {
        await $('#customerName').setValue(name);
    }

    async fillEmail(email: string) {
        await $('#customerAddress').setValue(email);
    }

    async selectPaymentMethod(method: string) {
        await $('#paymentMethod').selectByVisibleText(method);
    }

    async getPaymentMethodOptions() {
        await $('#paymentMethod').waitForExist();

        const optionTexts = await browser.execute(() => {
            const select = document.querySelector<HTMLSelectElement>('#paymentMethod');
            if (!select) {
                return [];
            }
            return Array.from(select.options).map(opt => opt.text.trim());
        });

        return optionTexts;
    }

    async placeOrder() {
        await $('form button[type="submit"]').click();
    }
}

export default new CheckoutPage();
