import { browser, expect, $$, $ } from '@wdio/globals';

export class WelcomePage {
    get navbarItems() {
        return $$('nav ul > li');
    }

    async open() {
        await browser.url(process.env.DEMO_BASE_URL! + '/');
    }

    async getHeading() {
        return await $('h1').getText();
    }

    async getBody() {
        return await $('div.hero1 p').getText();
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

    async getGotoMenuButton() {
        return await $('a[href="#menu"]').getText();
    }
}

export default new WelcomePage();
