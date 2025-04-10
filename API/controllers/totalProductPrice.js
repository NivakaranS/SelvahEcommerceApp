const handleProductPrice = (req, res, db) => {
    const { productId, quantity } = req.body;

    // Check for incomplete form submission
    if (!productId || quantity < 0) {
        return res.status(400).json('Incorrect form submission');
    }

    // Start transaction
    db.transaction(trx => {
        return trx
            .select(
                'p.productId',
                'p.productName',
                'p.description',
                'pr.quantity',    // max quantity for the specific price
                'pr.price'        // Price for the specific quantity range
            )
            .from('product as p')
            .leftOuterJoin('price as pr', 'p.productId', 'pr.productId')
            .where('p.productId', productId)
            .then(products => {
                if (!products || products.length === 0) {
                    throw new Error('No products found for the given productId');
                }

                const product = products[0];  // Assuming a single product for the given productId
                let totalPrice = 0;
                let unitPrice = 0;
                let foundPrice = false;

                // Iterate over the retrieved price records to find the applicable price
                for (const priceRecord of products) {
                    // Check if the requested quantity is within the current quantity range
                    if (quantity <= priceRecord.quantity) {
                        unitPrice = priceRecord.price; // Get the unit price for this quantity range
                        totalPrice = unitPrice * quantity; // Calculate total price
                        foundPrice = true;
                        break; // Exit the loop once the price is found
                    }
                }

                if (!foundPrice) {
                    // If no applicable price was found, assume the last price record is for the highest quantity
                    unitPrice = products[products.length - 1].price;
                    totalPrice = unitPrice * quantity; // Calculate total price based on the highest available price
                }

                // Send response with product details and total calculated price
                res.json({
                    productId: product.productId,
                    productName: product.productName,
                    description: product.description,
                    unitPrice: unitPrice, // Send the unit price based on the quantity range
                    quantityRequested: quantity,
                    totalPrice: totalPrice
                });
                
                // Logging without sensitive data
                console.log(`Product ID: ${product.productId}, Quantity: ${quantity}, Unit Price: ${unitPrice}, Total Price: ${totalPrice}`);
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
    handleProductPrice
};
