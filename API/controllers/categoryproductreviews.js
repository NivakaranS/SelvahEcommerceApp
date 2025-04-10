const handleCategoryProductReviews = (req, res, db) => {
    const { productId } = req.body;

    // Check for incomplete form submission
    if (!productId) {
        return res.status(400).json('Incorrect form submission');
    }

    // Start transaction
    db.transaction(trx => {
        return trx
            .select(
                'r.*', // Select all columns from the reviews table
                'u.first_name', // Get first name from users table
                'u.last_name'   // Get last name from users table
            )
            .from('reviews as r')
            .leftJoin('users as u', 'r.userId', 'u.userId')  // Join with users table using userId
            .where('r.productId', productId)  // Use the productId from request
            .then(reviews => {
                if (!reviews || reviews.length === 0) {
                    return res.status(404).json('No reviews found for the given productId');
                }
                res.json(reviews);  // Send reviews with user details as response
                console.log(reviews);
            })
            .catch(err => {
                console.error(err);
                res.status(400).json('Error in getting product reviews'); // Send error response
            });
    })
    .catch(err => {
        console.error(err);
        res.status(500).json('Unable to process the request'); // Server error response
    });
};

module.exports = {
    handleCategoryProductReviews
};
