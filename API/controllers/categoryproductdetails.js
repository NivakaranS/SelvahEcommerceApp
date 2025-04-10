const handleCategoryProductDetails = (req, res, db) => {
    const { productId } = req.body;

    // Check for incomplete form submission
    if (!productId) {
        return res.status(400).json('Incorrect form submission');
    }

    // Start transaction
    db.transaction(trx => {
        return trx
            .select(
                'p.productId',
                'pr.priceId',
                'p.categoryId',
                'p.views',
                'p.productName',
                'p.subtitle',
                'p.color',
                'p.description',
                'pr.quantity',
                'pr.price'
            )
            .from('product as p')
            .leftOuterJoin('price as pr', 'p.productId', 'pr.productId')
            .where('p.productId', productId)
            .then(products => {
                if (!products || products.length === 0) {
                    throw new Error('Products not found for the given productId');
                }
                res.json(products);  // Send products with price as response
                console.log(products);
            })
            .catch(err => {
                console.error(err);
                res.status(400).json('Error in getting product details'); // Send error response
            });
    })
    .catch(err => {
        console.error(err);
        res.status(500).json('Unable to process the request'); // Server error response
    });
};

module.exports = {
    handleCategoryProductDetails
};
