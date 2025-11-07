import { browser, expect, $$ } from '@wdio/globals';
import { skWaitForNetworkIdle, skWait, skGetText } from '../utils/sveltekit-support';

export class AboutPage {
    get navbarItems() {
        return $$('nav ul > li');
    }

    async open() {
        await browser.url(process.env.DEMO_BASE_URL! + '/about');
        await skWaitForNetworkIdle();
        await skWait();
    }

    async getHeading() {
        return await skGetText('h1');
    }

    async getBody() {
        return await skGetText('article');
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
}

export default new AboutPage();
