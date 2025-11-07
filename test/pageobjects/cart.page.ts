import { z } from 'zod';
import { browser } from '@wdio/globals';
import { PriceSchema } from './menu.page';
import { skClick, skWait, skWaitForVisible, skWaitForNetworkIdle } from '../utils/sveltekit-support';

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
        await skClick('div.my-cart-icon');
        // Wait for modal to be visible (now properly handles position:fixed)
        await skWaitForVisible('#cart');
    }

    async closeCart() {
        await skClick('#cart button[data-dismiss="modal"]');
    }

    async checkout() {
        await skClick('#cart a[href$="/checkout"]');

        // Wait for navigation
        await browser.waitUntil(
            async () => (await browser.getUrl()).includes('checkout'),
            { timeout: 3000 }
        );

        // Wait for page to load and hydrate (this fixes the long delay before form filling)
        await skWaitForNetworkIdle();
    }

    async getCartItems() {
        // Wait for SvelteKit to render
        await skWait();

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

        // Wait for SvelteKit to update DOM
        await skWait();
    }
}

export default new CartPage();
