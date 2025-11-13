import { expect } from "@wdio/globals";
import WelcomePage from "../pageobjects/welcome.page";
import AboutPage from "../pageobjects/about.page";
import MenuPage from "../pageobjects/menu.page";

describe("Content display", () => {
  it("BD-055: User should see the content according to the About Us information", async () => {
    // Test case: https://qasdemo.eu2.qasphere.com/project/BD/tcase/55
    await AboutPage.open();

    const heading = await AboutPage.getHeading();

    // Example: Manual screenshot for testing attachment system
    // Set BROKEN_TEST=1 to verify that both manual and automatic screenshots are attached to JUnit XML
    if (process.env.BROKEN_TEST === "1") {
      const file = "./screenshots/BD-055_manual_before_check.png";
      const fs = await import("fs/promises");
      await fs.mkdir("./screenshots", { recursive: true });
      await browser.saveScreenshot(file);
      console.log("[[ATTACHMENT|${file}]]");
      console.error("[[ATTACHMENT|${file}]]");

      // This will intentionally fail to test screenshot attachment
      expect(heading).toBe("WRONG HEADING - This will fail");
    }

    expect(heading).toBe("Welcome to Bistro Delivery");

    const body = await AboutPage.getBody();
    // Normalize whitespace to handle tabs/line breaks in the actual text
    const normalizedBody = body.replace(/\s+/g, " ").trim();
    expect(normalizedBody).toContain(
      "So, while you won't actually be able to order your favorite quiche or ratatouille from us," +
        " you can certainly rely on QA Sphere to deliver the tools and systems you need to ensure your software projects" +
        " are a recipe for success. Bon appétit and happy testing!",
    );
  });

  it("BD-026: Correct display of blocks and buttons in the navbar", async () => {
    // Test case: https://qasdemo.eu2.qasphere.com/project/BD/tcase/26
    await WelcomePage.open();
    let navbarItems = await WelcomePage.getNavbarItems();
    expect(navbarItems).toEqual([
      { text: "Welcome", isActive: true },
      { text: "Today's Menu", isActive: false },
      { text: "About us", isActive: false },
    ]);

    await MenuPage.open();
    navbarItems = await MenuPage.getNavbarItems();
    expect(navbarItems).toEqual([
      { text: "Welcome", isActive: false },
      { text: "Today's Menu", isActive: true },
      { text: "About us", isActive: false },
    ]);

    await AboutPage.open();
    navbarItems = await AboutPage.getNavbarItems();
    expect(navbarItems).toEqual([
      { text: "Welcome", isActive: false },
      { text: "Today's Menu", isActive: false },
      { text: "About us", isActive: true },
    ]);
  });

  it("BD-038: User should see the Pizzas list by default on the Todays Menu block", async () => {
    // Test case: https://qasdemo.eu2.qasphere.com/project/BD/tcase/38
    await MenuPage.open();

    const pizzaMenu = await MenuPage.getPizzaMenu();
    let tabs = await MenuPage.getTabs();
    expect(tabs).toEqual([
      { text: "PIZZAS", isActive: true },
      { text: "DRINKS", isActive: false },
      { text: "DESSERTS", isActive: false },
    ]);
    expect(pizzaMenu.length).toBeGreaterThan(0);

    const drinksMenu = await MenuPage.getOtherMenu("drinks");
    tabs = await MenuPage.getTabs();
    expect(tabs).toEqual([
      { text: "PIZZAS", isActive: false },
      { text: "DRINKS", isActive: true },
      { text: "DESSERTS", isActive: false },
    ]);
    expect(drinksMenu.length).toBeGreaterThan(0);

    const dessertsMenu = await MenuPage.getOtherMenu("desserts");
    tabs = await MenuPage.getTabs();
    expect(tabs).toEqual([
      { text: "PIZZAS", isActive: false },
      { text: "DRINKS", isActive: false },
      { text: "DESSERTS", isActive: true },
    ]);
    expect(dessertsMenu.length).toBeGreaterThan(0);
  });

  it("BD-052: User should see the Todays Menu block after clicking the Todays Menu button in the Welcome banner", async () => {
    // Test case: https://qasdemo.eu2.qasphere.com/project/BD/tcase/52
    await WelcomePage.open();

    const heading = await WelcomePage.getHeading();
    expect(heading).toBe("Bistro Delivery");

    const body = await WelcomePage.getBody();
    expect(body).toBe(
      "Elegance of French&Italian Cuisine Delivered Directly to Your Doorstep!",
    );

    const gotoMenuButton = await WelcomePage.getGotoMenuButton();
    expect(gotoMenuButton).toBe("View Today's Menu");
  });
});
