import { z } from 'zod';
import { browser, $$, $, expect } from '@wdio/globals';

export type Tab = 'pizza' | 'drinks' | 'desserts';

export const PriceSchema = z
    .string()
    .regex(/^\$\d+(?:\.\d{2})?$/)
    .transform((val) => Number.parseFloat(val.slice(1)));

export const PizzaItemSchema = z.object({
    name: z.string().min(1),
    image: z.string().min(1),
    description: z.string().min(1),
    price: PriceSchema,
});

export const PizzaMenuSchema = z.array(PizzaItemSchema).min(1);

export const OtherItemSchema = z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    price: PriceSchema,
});

export const OtherMenuSchema = z.array(OtherItemSchema).min(1);

export class MenuPage {
    get navbarItems() {
        return $$('nav ul > li');
    }

    get tabButtons() {
        return $$('div.buttons-container a');
    }

    async open() {
        await browser.url(process.env.DEMO_BASE_URL! + '/#menu');
    }

    async getNavbarItems() {
        const items = await this.navbarItems;
        expect(items).toHaveLength(3);

        const linkItemsObj = [];
        for (const item of items) {
            const text = (await item.getText()).trim();
            const className = await item.getAttribute('class');
            const isActive = className?.includes('active') ?? false;

            linkItemsObj.push({
                text,
                isActive,
            });
        }

        return linkItemsObj;
    }

    async getTabs() {
        const children = await this.tabButtons;

        const tabs = [];
        for (const child of children) {
            const text = (await child.getText()).trim();
            const className = await child.getAttribute('class');
            const isActive = (className || '').includes('is-active');

            tabs.push({ text, isActive });
        }

        return tabs;
    }

    async switchTab(tab: Tab) {
        // Check if tab is already active
        const isActive = await browser.execute((tabName: string) => {
            const tabButton = document.querySelector<HTMLAnchorElement>(`a[data-target='${tabName}Menu']`);
            return tabButton?.classList.contains('is-active') ?? false;
        }, tab);

        if (isActive) {
            return;
        }

        await $(`a[data-target='${tab}Menu']`).click();
    }

    async getPizzaMenu() {
        await this.switchTab('pizza');

        const items = await browser.execute(() => {
            const items = Array.from(
                document.querySelectorAll(`section#menu > div > div.menu--is-visible > div.row`)
            );

            return items.map((item) => {
                const name = item.querySelector('h3.item__title')?.textContent?.trim() ?? '';
                const price = item.querySelector('span.item__price')?.textContent?.trim() ?? '';
                const description = item.querySelector('p.item__description')?.textContent?.trim() ?? '';
                const image = item.querySelector('img')?.getAttribute('src') ?? '';

                return {
                    name,
                    image,
                    description,
                    price,
                };
            });
        });
        return PizzaMenuSchema.parse(items);
    }

    async getOtherMenu(item: 'drinks' | 'desserts') {
        await this.switchTab(item);

        const items = await browser.execute(() => {
            const items = Array.from(
                document.querySelectorAll(`section#menu > div > div.menu--is-visible > div.row`)
            );

            return items.map((item) => {
                const name = item.querySelector('h3.item__title')?.textContent?.trim() ?? '';
                const price = item.querySelector('span.item__price')?.textContent?.trim() ?? '';
                const description = item.querySelector('p.item__description')?.textContent?.trim() ?? '';

                return {
                    name,
                    description,
                    price,
                };
            });
        });
        return OtherMenuSchema.parse(items);
    }

    async addMenuItemToCart(idx: number) {
        // Use direct JavaScript click for speed and reliability
        await browser.execute((index: number) => {
            const rows = document.querySelectorAll('section#menu div.menu--is-visible div.row');
            const button = rows[index]?.querySelector<HTMLButtonElement>('button');
            if (!button) {
                throw new Error(`Menu item button at index ${index} not found`);
            }
            button.click();
        }, idx);
    }
}

export default new MenuPage();
