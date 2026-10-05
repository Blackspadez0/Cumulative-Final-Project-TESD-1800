const { faker } = require("@faker-js/faker");

function createFakeProduct() {
  return {
    name: faker.commerce.productName(),
    price: faker.commerce.price({ min: 1, max: 100, dec: 2 }), // string like "45.00"
    inventory: faker.number.int({ min: 1, max: 200 }),
  };
}

module.exports = { createFakeProduct };