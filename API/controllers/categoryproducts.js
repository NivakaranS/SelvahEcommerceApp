const handleCategoryProducts = (req, res, db) => {
    const { categoryId } = req.body;

    // Check for incomplete form submission
    if (!categoryId) {
        return res.status(400).json('Incorrect form submission');
    }

    // Start transaction
    db.transaction(trx => {
        return trx.select('*').from('product').where({ categoryId })
            .then(products => {
                if (!products || products.length === 0) {
                    throw new Error('Products not found for the given categoryId');
                }
                res.json(products);  // Send products as response
                console.log(products);
            })
            .catch(err => {
                console.error(err);
                res.status(400).json('Error in getting category products'); // Send error response
                 // Ensure transaction rollback
            });
    })
    .catch(err => {
        console.error(err);
        res.status(500).json('Unable to process the request'); // Server error response
    });
};

module.exports = {
    handleCategoryProducts
};
