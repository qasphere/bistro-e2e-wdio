import { expect, $ } from '@wdio/globals';
import MenuPage from '../pageobjects/menu.page';
import CartPage from '../pageobjects/cart.page';
import CheckoutPage, { paymentMethods } from '../pageobjects/checkout.page';

const addCommonItemsToCart = async () => {
    await MenuPage.switchTab('pizza');
    await MenuPage.addMenuItemToCart(0);
    await MenuPage.addMenuItemToCart(1);
    await MenuPage.addMenuItemToCart(1);

    await MenuPage.switchTab('drinks');
    await MenuPage.addMenuItemToCart(0);
    await MenuPage.addMenuItemToCart(1);

    await MenuPage.switchTab('desserts');
    await MenuPage.addMenuItemToCart(0);
};

describe('Cart functionality', () => {
    beforeEach(async () => {
        // Reload session to ensure complete test isolation
        // WebDriver reuses browser sessions, so cart state can persist in app memory
        await browser.reloadSession();
    });

    afterEach(async () => {
        // Ensure cart modal is closed to prevent test pollution
        try {
            const cartModal = await $('#cart');
            const isDisplayed = await cartModal.isDisplayed();
            if (isDisplayed) {
                await CartPage.closeCart();
            }
        } catch (error) {
            // Cart modal may not exist or already closed, that's fine
            console.log('[afterEach] Cart cleanup skipped:', error);
        }
    });

    it('BD-023: User should see product list according the cart on the Checkout page', async () => {
        // Test case: https://qasdemo.eu2.qasphere.com/project/BD/tcase/23
        await MenuPage.open();

        // Get menu data first (this will switch tabs, but we'll switch again when adding)
        const pizzaMenu = await MenuPage.getPizzaMenu();
        const drinksMenu = await MenuPage.getOtherMenu('drinks');
        const dessertsMenu = await MenuPage.getOtherMenu('desserts');

        // Now add items to cart
        await addCommonItemsToCart();

        await CartPage.openCart();

        const expectedInitialCart = {
            items: [
                { name: pizzaMenu[0].name, amount: pizzaMenu[0].price },
                { name: pizzaMenu[1].name, amount: pizzaMenu[1].price * 2 },
                { name: drinksMenu[0].name, amount: drinksMenu[0].price },
                { name: drinksMenu[1].name, amount: drinksMenu[1].price },
                { name: dessertsMenu[0].name, amount: dessertsMenu[0].price },
            ],
            total:
                pizzaMenu[0].price +
                pizzaMenu[1].price * 2 +
                drinksMenu[0].price +
                drinksMenu[1].price +
                dessertsMenu[0].price,
        };

        let cartResponse = await CartPage.getCartItems();
        expect(cartResponse).toEqual(expectedInitialCart);

        await CartPage.removeCartItem(1);
        await CartPage.removeCartItem(0);

        const expectedAfterRemoval = {
            items: [
                { name: drinksMenu[0].name, amount: drinksMenu[0].price },
                { name: drinksMenu[1].name, amount: drinksMenu[1].price },
                { name: dessertsMenu[0].name, amount: dessertsMenu[0].price },
            ],
            total: drinksMenu[0].price + drinksMenu[1].price + dessertsMenu[0].price,
        };

        cartResponse = await CartPage.getCartItems();
        expect(cartResponse).toEqual(expectedAfterRemoval);

        await CartPage.closeCart();

        await MenuPage.switchTab('pizza');
        await MenuPage.addMenuItemToCart(1);
        await MenuPage.addMenuItemToCart(1);

        await CartPage.openCart();

        const expectedAfterAddingBack = {
            items: [
                { name: drinksMenu[0].name, amount: drinksMenu[0].price },
                { name: drinksMenu[1].name, amount: drinksMenu[1].price },
                { name: dessertsMenu[0].name, amount: dessertsMenu[0].price },
                { name: pizzaMenu[1].name, amount: pizzaMenu[1].price * 2 },
            ],
            total:
                drinksMenu[0].price +
                drinksMenu[1].price +
                dessertsMenu[0].price +
                pizzaMenu[1].price * 2,
        };

        cartResponse = await CartPage.getCartItems();
        expect(cartResponse).toEqual(expectedAfterAddingBack);

        await CartPage.closeCart();
    });

    it('BD-022: User should place the order successfully after entering valid data in all required fields and selecting the "Cash" payment', async () => {
        // Test case: https://qasdemo.eu2.qasphere.com/project/BD/tcase/22
        await MenuPage.open();

        // Get menu data FIRST to avoid redundant tab switching
        const pizzaMenu = await MenuPage.getPizzaMenu();
        const drinksMenu = await MenuPage.getOtherMenu('drinks');
        const dessertsMenu = await MenuPage.getOtherMenu('desserts');

        await addCommonItemsToCart();

        const expectedOrderSummary = {
            items: [
                { name: pizzaMenu[0].name, amount: pizzaMenu[0].price },
                { name: pizzaMenu[1].name, amount: pizzaMenu[1].price * 2 },
                { name: drinksMenu[0].name, amount: drinksMenu[0].price },
                { name: drinksMenu[1].name, amount: drinksMenu[1].price },
                { name: dessertsMenu[0].name, amount: dessertsMenu[0].price },
            ],
            total:
                pizzaMenu[0].price +
                pizzaMenu[1].price * 2 +
                drinksMenu[0].price +
                drinksMenu[1].price +
                dessertsMenu[0].price,
        };

        await CartPage.openCart();
        const cartBeforeCheckout = await CartPage.getCartItems();
        expect(cartBeforeCheckout).toEqual(expectedOrderSummary);

        await CartPage.checkout();

        const orderSummary = await CheckoutPage.getOrderItems();
        expect(orderSummary).toEqual(expectedOrderSummary);

        const paymentOptions = await CheckoutPage.getPaymentMethodOptions();
        expect(paymentOptions).toEqual(paymentMethods);

        await CheckoutPage.fillName('John Doe');
        await CheckoutPage.fillEmail('johndoe@example.com');
        await CheckoutPage.selectPaymentMethod('Cash on Delivery');
        await CheckoutPage.placeOrder();
    });
});
