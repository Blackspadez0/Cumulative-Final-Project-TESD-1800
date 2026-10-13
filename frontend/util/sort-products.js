function sortProducts(products, sortType) {
    const sortedProducts = products;

    switch(sortType) {
        case "nameAscending":
            sortedProducts.sort((previous, current) => {
                if (previous.name < current.name) {
                    return -1;
                } else if (previous.name > current.name) {
                    return 1;
                }
                return 0;
            })
            break;
        case "priceAscending":
            sortedProducts.sort((previous, current) => {
                if (previous.price < current.price) {
                    return -1;
                } else if (previous.price > current.price) {
                    return 1;
                }
                return 0;
            })
            break;
        case "ratingDescending":
            sortedProducts.sort((previous, current) => {
                if (previous.rating > current.rating) {
                    return -1;
                } else if (previous.rating < current.rating) {
                    return 1;
                }
                return 0;
            })
            break;
    }

    return sortedProducts;
}

module.exports = sortProducts;