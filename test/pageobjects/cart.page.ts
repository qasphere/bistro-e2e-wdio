import { z } from 'zod';
import { browser, $ } from '@wdio/globals';
import { PriceSchema } from './menu.page';

export const CartItemSchema = z.object({
    name: z.string().min(1),
    amount: PriceSchema,
});

export const CartResponseSchema = z.object({
    items: z.array(CartItemSchema),
    total: PriceSchema,
});

export class CartPage {
    async openCart() {
        await $('div.my-cart-icon').click();
        await $('#cart').waitForDisplayed();
    }

    async closeCart() {
        await $('#cart button[data-dismiss="modal"]').click();
    }

    async checkout() {
        await $('#cart a[href$="/checkout"]').click();

        // Wait for navigation
        await browser.waitUntil(
            async () => (await browser.getUrl()).includes('checkout'),
            { timeout: 3000 }
        );
    }

    async getCartItems() {
        // Direct read using JavaScript
        const data = await browser.execute(() => {
            const rows = Array.from(document.querySelectorAll('#cart div.row.border-bottom'));
            const items = rows.map((row) => {
                const name = row.querySelector('div:nth-child(2)')?.textContent?.trim() ?? '';
                const amount = row.querySelector('div:nth-child(4)')?.textContent?.trim() ?? '';
                return { name, amount };
            });
            const total = document
                .querySelector('#cart div[data-testid="cartTotal"]')
                ?.textContent?.trim() ?? '';

            return { items, total };
        });

        return CartResponseSchema.parse(data);
    }

    async removeCartItem(idx: number) {
        // Remove item with direct JavaScript click
        await browser.execute((index: number) => {
            const rows = document.querySelectorAll('#cart div.row.border-bottom');
            const button = rows[index]?.querySelector<HTMLButtonElement>('button');
            if (!button) {
                throw new Error(`Cart item remove button at index ${index} not found`);
            }
            button.click();
        }, idx);
    }
}

export default new CartPage();
