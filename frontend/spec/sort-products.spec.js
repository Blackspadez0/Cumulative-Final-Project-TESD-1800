const sortProducts = require("../util/sort-products");

describe("sortProducts", () => {
    const testData = [ 
        { name: "Shovel", price: 10, inventory: 20, rating: 5 },
        { name: "Gloves", price: 6, inventory: 40, rating: 3 },
        { name: "Ski Mask", price: 12, inventory: 30, rating: 4 },
    ];

    it("sorts products by name alphabetically", () => {
        const expectedOutput = [
            { name: "Gloves", price: 6, inventory: 40, rating: 3 },
            { name: "Shovel", price: 10, inventory: 20, rating: 5 },
            { name: "Ski Mask", price: 12, inventory: 30, rating: 4 },
        ];

        const actualSorting = sortProducts(testData, "nameAscending");

        expect(actualSorting).toEqual(expectedOutput);
    });

    it("sorts products by increasing price", () => {
        const expectedOutput = [
            { name: "Gloves", price: 6, inventory: 40, rating: 3 },
            { name: "Shovel", price: 10, inventory: 20, rating: 5 },
            { name: "Ski Mask", price: 12, inventory: 30, rating: 4 },
        ];

        const actualSorting = sortProducts(testData, "priceAscending");

        expect(actualSorting).toEqual(expectedOutput);
    });

    it("sorts products by decreasing rating", () => {
        const expectedOutput = [
            { name: "Shovel", price: 10, inventory: 20, rating: 5 },
            { name: "Ski Mask", price: 12, inventory: 30, rating: 4 },
            { name: "Gloves", price: 6, inventory: 40, rating: 3 },
        ];

        const actualSorting = sortProducts(testData, "ratingDescending");

        expect(actualSorting).toEqual(expectedOutput);
    });
});