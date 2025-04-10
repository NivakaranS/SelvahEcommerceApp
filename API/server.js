const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const knex = require('knex');

// const register = require('./controllers/register');
// const signin = require('./controllers/signin');
// // const profile = require('./controllers/profile');
// // const image = require('./controllers/image');
// const categoryproducts = require('./controllers/categoryproducts');
// const categoryproductdetails = require('./controllers/categoryproductdetails');
// const categoryproductreviews = require('./controllers/categoryproductreviews');
// const totalProductPrice = require('./controllers/totalProductPrice');


const db = knex({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    user: 'root',
    password: 'Selvah@2002',
    database: 'SelvahFinal',
  },
});


const app = express();

app.use(cors());
app.use(express.json());



// Set the timeout (e.g., 120000 milliseconds = 2 minutes)
app.use((req, res, next) => {
  res.setTimeout(120000, () => {
    console.log('Request has timed out.');
    res.status(408).send('Request timeout');
  });
  next();
});



// Registering A new user
app.post('/user/register', async (req, res) => {
  const { 
    title, firstName, lastName, phoneNumber, gender, dob, accountType, email, 
    deviceId, deviceModel, deviceBrand, deviceType, OS, version, appVersion, 
    ipAddress, MAC, batteryLevel, networkCarrier, deviceLatitude, deviceLongitude 
  } = req.body;

  // Check for incomplete form submission
  if (!title || !firstName || !lastName || !phoneNumber || !gender || !dob || !accountType || !email || 
      !deviceId || !deviceModel || !deviceBrand || !deviceType || !OS || !version || !appVersion || 
      !ipAddress || !MAC || !batteryLevel || !networkCarrier) {
    return res.status(400).json('Incorrect form submission');
  }

  try {
    // Start transaction
    await db.transaction(async trx => {
      // Insert the new user
      await trx('user').insert({
        title: title,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        gender: gender,
        dob: dob,
        accountType: accountType,
        email: email
      });

      // Get the userId of the newly inserted user
      const user = await trx('user').where('phoneNumber', phoneNumber).first();

      if (user) {
        // Insert device information
        await trx('devices').insert({
          deviceId: deviceId,
          deviceModel: deviceModel,
          deviceBrand: deviceBrand,
          deviceType: deviceType,
          OS: OS,
          version: version,
          appVersion: appVersion,
          ipAddress: ipAddress,
          MAC: MAC,
          batteryLevel: batteryLevel,
          networkCarrier: networkCarrier,
          userId: user.userId,
          deviceLatitude: deviceLatitude,
          deviceLongitude: deviceLongitude
        });

        res.json({
          userId: user.userId,
          message: 'User registered and device information logged successfully'
        });
      } else {
        throw new Error('Unable to retrieve newly registered user');
      }
    });
  } catch (error) {
    console.error('Error registering user or logging device information:', error);
    res.status(500).json('Error registering user or logging device information');
  }
});






// User Logging in
app.post('/user/login', (req, res) => {
  const { 
    phoneNumber, deviceId, deviceModel, deviceBrand, deviceType, 
    OS, version, appVersion, ipAddress, MAC, batteryLevel, 
    networkCarrier, deviceLatitude, deviceLongitude 
  } = req.body;

  // Check for incomplete form submission
  if (!phoneNumber || !deviceId || !deviceModel || !deviceBrand || !deviceType || 
      !OS || !version || !appVersion || !ipAddress || !MAC || !batteryLevel || 
      !networkCarrier ) {
    return res.status(400).json('Incorrect form submission');
  }

  db('user').where({ phoneNumber: phoneNumber })
    .then(user => {
      if (user.length) {
        const userId = user[0].userId;

        db('devices').insert({
          deviceId: deviceId,
          deviceModel: deviceModel,
          deviceBrand: deviceBrand,
          deviceType: deviceType,
          OS: OS,
          version: version,
          appVersion: appVersion,
          ipAddress: ipAddress,
          MAC: MAC,
          batteryLevel: batteryLevel,
          networkCarrier: networkCarrier,
          userId: userId,
          deviceLatitude: deviceLatitude,
          deviceLongitude: deviceLongitude
        })
        .then(() => {
          res.json("User logged in successfully");
        })
        .catch(error => {
          console.error('Error logging device information:', error);
          res.status(500).json('Error logging device information');
        });

      } else {
        res.status(404).json('User not found');
      }
    })
    .catch(error => {
      console.error('Error searching user:', error);
      res.status(500).json('Error searching user');
    });
});








// TO GET ALL THE USER'S DATA BASED ON PHONE NUMBER
app.post('/user', async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    // Get userId from users table using phoneNumber
    const user = await db.select('userId').from('user').where('phoneNumber', phoneNumber).first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.userId;

    // Get orders count and reviews count using userId
    const getUserOrdersCount = db('orders').count('orderId as ordersCount').where('userId', userId);
    const getUserReviewsCount = db('reviews').count('reviewId as reviewsCount').where('userId', userId);

    // Resolve promises for orders count and reviews count
    const [ordersCount, reviewsCount] = await Promise.all([getUserOrdersCount, getUserReviewsCount]);

    res.json({
      userId: userId,
      ordersCount: ordersCount[0].ordersCount,
      reviewsCount: reviewsCount[0].reviewsCount
    });

  } catch (error) {
    console.error('Error getting user data:', error);
    res.status(500).json({ error: 'Error getting user data' });
  }
});





// TO UPDATE USER DATA
app.post('/user/update/:id', (req, res) => {
  const {title, firstName, lastName, phoneNumber, gender, dob, email, accountType, profileImageLink } = req.body;

  //Check for incomplete form submisson
  if( !title || !firstName || !lastName || !phoneNumber || !gender || !dob || !email || !accountType || !profileImageLink) {
    return res.status(400).json('Incorrect form submission')
  }

  //Start transaction
  db.transaction(trx => {
    trx.update({
        title: title,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        gender: gender,
        dob: dob,
        email: email,
        accountType: accountType,
        profileImageLink: profileImageLink,

    })
    .into('users') // Return the inserted record
    .then(user => {
        if (!user || user.length === 0) {
            throw new Error('User not found after insertion');
        }
        return trx.commit() // Commit the transaction before sending response
            .then(() => res.json(user[0])); // Send the first user object
    })
    .catch(err => {
        trx.rollback(); // Rollback if there's an error
        console.error(err);
        res.status(400).json('unable to register'); // Send error response
    });
})
.catch(err => {
    console.error(err);
    res.status(400).json('unable to register here'); // Handle errors outside the transaction
});


})


// TO GET ALL THE PRODUCTS THAT BELONG TO A CATEGORY
app.get('/products/category/:id', (req, res) => {
  const id = req.params.id;

  db.select('*').from('Product').where('categoryId', id)
    .then(categoryProducts => {
      if (categoryProducts.length) {
        res.json(categoryProducts);
      } else {
        res.status(400).json('Category products not found');
      }
    })
    .catch(error => {
      res.status(400).json('Error getting category products');
    });
});



// SEARCH FOR A PRODUCT
app.post('/products/search', (req, res) => {
  const { productName } = req.body;

  // Check for incomplete form submission
  if (!productName) {
    return res.status(400).json('Incorrect form submission');
  }

  // Modify the query to use the LIKE operator for partial matches anywhere within the product name
  db.select('*').from('Product').where('name', 'like', `%${productName}%`)
    .then(products => {
      if (products.length) {
        res.json({
          count: products.length,
          products: products
        });
      } else {
        res.status(404).json('Product not found');
      }
    })
    .catch(error => {
      console.error('Error getting products:', error);
      res.status(500).json('Error getting products');
    });
});


// GET ALL THE PRODUCT NAMES
app.post('/products/names', (req, res) => {

  db.select('name').from('Product') // Select only the 'name' column
    .then(products => {
      if (products.length) {
        res.json(products);
      } else {
        res.status(404).json('Products not found'); // Adjusted message to plural
      }
    })
    .catch(error => {
      console.error('Error getting products:', error);
      res.status(500).json('Error getting products');
    });
});


// GET ALL THE PRODUCTS IN THE SUB CATEGORY
app.get('/products/subcategory/:id', (req, res) => {
  const id = req.params.id;

  db.select('*').from('Product').where('subCategoryId', id)
    .then(subCategoryProducts => {
      if (subCategoryProducts.length) {
        res.json({
          count: subCategoryProducts.length,
          products: subCategoryProducts
        });
      } else {
        res.status(400).json('Sub category products not found');
      }
    })
    .catch(error => {
      res.status(400).json('Error getting sub category products');
    });
});


app.post('/productDetails', async (req, res) => {
  const { productId } = req.body;

  if (!productId || isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    await db.transaction(async trx => {
      // Increment the views for the product
      const result = await trx('Product')
        .where('productId', productId)
        .increment('views', 1);

      if (result === 0) {
        res.status(404).json({ error: 'Product not found' });
        throw new Error('Product not found');
      }

      // Fetch the updated product details
      const updatedProduct = await trx('Product')
        .select('*')
        .where('productId', productId)
        .first();

      if (updatedProduct) {
        res.json(updatedProduct);
      } else {
        res.status(404).json({ error: 'Product not found' });
        throw new Error('Product not found');
      }
    });
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json('Server error');
  }
});







// GET ALL THE PRODUCT NAMES
app.get('/product', (req, res) => {

  db.select('*').from('Product') // Select only the 'name' column
    .then(products => {
      if (products.length) {{
        res.json({
          count: products.length,
          products: products});
        
      }
        
      } else {
        res.status(404).json('Products not found'); // Adjusted message to plural
      }
    })
    .catch(error => {
      console.error('Error getting products:', error);
      res.status(500).json('Error getting products');
    });
});

// GET ALL THE CATEGORY DETAIL
app.get('/categories', (req, res) => {

  db.select('*').from('Category') // Select only the 'name' column
    .then(categories => {
      if (categories.length) {{
        res.json({
          count: categories.length,
          categories: categories});
        
      }
        
      } else {
        res.status(404).json('Categories not found'); // Adjusted message to plural
      }
    })
    .catch(error => {
      console.error('Error getting categories:', error);
      res.status(500).json('Error getting categories');
    });
});

// GET ALL THE SUB-CATEGORY DETAIL ASSOCIATED WITH A CATEGORY
app.get('/subcategory/:id', (req, res) => {
  const id = req.params.id;

  db.select('*').from('subCategory').where('categoryId', id)
    .then(subCategory => {
      if (subCategory.length) {
        res.json(subCategory);
      } else {
        res.status(400).json('Sub category not found');
      }
    })
    .catch(error => {
      res.status(400).json('Error getting sub category details');
    });
});

// GET ALL THE SUB CATEGORY DETAIL
app.get('/subcategory', (req, res) => {

  db.select('*').from('subCategory') // Select only the 'name' column
    .then(categories => {
      if (categories.length) {{
        res.json({
          count: categories.length,
          categories: categories});
        
      }
        
      } else {
        res.status(404).json('Sub category not found'); // Adjusted message to plural
      }
    })
    .catch(error => {
      console.error('Error getting sub categories:', error);
      res.status(500).json('Error getting sub categories');
    });
});



// ADD OR REMOVE A PRODUCT TO/FROM FAVOURITES
app.post('/favourite/add', async (req, res) => {
  const { phoneNumber, productId } = req.body;

  // Check for incomplete form submission
  if (!phoneNumber || !productId) {
    return res.status(400).json('Incorrect form submission');
  }

  try {
    // Fetch the userId using the phoneNumber
    const user = await db('user').select('userId').where('phoneNumber', phoneNumber).first();

    if (!user) {
      return res.status(404).json('User not found');
    }

    const userId = user.userId;

    // Check if the product already exists in the favourites for the user
    const favourite = await db('Favourites').where({ productId, userId }).first();

    if (favourite) {
      // If the product is already in favourites, remove it
      await db('Favourites').where({ productId, userId }).del();
      return res.json('Product removed from favourites successfully');
    } else {
      // If the product is not in favourites, add it
      await db('Favourites').insert({ productId, userId });
      return res.json('Product added to favourites successfully');
    }
  } catch (error) {
    console.error('Error adding/removing product to/from favourites:', error);
    return res.status(500).json('Error adding/removing product to/from favourites');
  }
});



// GET ALL THE FAVOURITE PRODUCTS DETAILS ASSOCIATED WITH A USER
app.post('/favourites', async (req, res) => {
  const { phoneNumber } = req.body;

  // Check for incomplete form submission
  if (!phoneNumber) {
    return res.status(400).json('Incorrect form submission');
  }

  try {
    // Fetch the userId using the phoneNumber
    const user = await db('user').select('userId').where('phoneNumber', phoneNumber).first();

    if (!user) {
      return res.status(404).json('User not found');
    }

    const userId = user.userId;

    // Start a transaction
    await db.transaction(async trx => {
      // Fetch all favourite product IDs associated with the userId
      const favourites = await trx('Favourites').select('productId').where('userId', userId);

      if (favourites.length) {
        const productIds = favourites.map(fav => fav.productId);

        // Fetch all product details for the favourite product IDs
        const products = await trx('Product').select('*').whereIn('productId', productIds);

        res.json(products);
      } else {
        res.status(404).json('No favourites found');
      }
    });

  } catch (err) {
    console.error('Error fetching favourite products:', err);
    res.status(500).json('Unable to fetch favourite products');
  }
});



// DELETE A PRODUCT FROM FAVOURITES
app.delete('/favourites/delete', (req, res) => {
  const { productId, userId } = req.body;

  // Check for incomplete form submission
  if (!productId || !userId) {
    return res.status(400).json('Incorrect form submission');
  }

  db('Favourites').where('productId', productId).andWhere('userId', userId).del()
    .then(result => {
      if (result) {
        res.json('Product deleted from favourites successfully');
      } else {
        res.status(404).json('Product not found in favourites');
      }
    })
    .catch(error => {
      console.error('Error deleting product from favourites:', error);
      res.status(500).json('Error deleting product from favourites');
    });
});

app.post('/review/add', (req, res) => {
  const { phoneNumber, productId, review, rating } = req.body; 

  // Check for incomplete form submission
  if (!productId || !phoneNumber || !review || !rating) {
    return res.status(400).json('Incorrect form submission');
  }

  // Retrieve userId from the users table using phoneNumber
  db('user').select('userId').where({ phoneNumber }).first()
    .then(user => {
      if (!user) {
        return res.status(404).json('User not found');
      }

      const userId = user.userId;

      // Check if a review already exists for the given userId and productId
      return db('Reviews').where({ userId, productId }).first()
        .then(existingReview => {
          if (existingReview) {
            // Update the existing review
            return db('Reviews')
              .where({ userId, productId })
              .update({
                review,
                rating
              })
              .then(() => {
                // Fetch the updated review
                return db('Reviews').where({ userId, productId }).first();
              })
              .then(updatedReview => {
                res.json({
                  message: "Review updated successfully",
                  review: updatedReview
                });
              });
          } else {
            // Insert a new review
            return db('Reviews').insert({
              productId,
              userId,
              review,
              rating
            })
            .then(insertedId => {
              // Fetch the inserted review using the last insert id
              return db('Reviews').where({ id: insertedId[0] }).first();
            })
            .then(insertedReview => {
              res.json({
                message: "Review added successfully",
                review: insertedReview
              });
            });
          }
        });
    })
    .catch(error => {
      console.error('Error adding or updating review:', error);
      res.status(500).json('Error adding or updating review');
    });
});



// GET ALL THE REVIEWS ASSOCIATED WITH A PRODUCT
app.get('/reviews/:id', (req, res) => {
  const id = req.params.id;

  db('Reviews')
    .join('User', 'Reviews.userId', '=', 'User.userId')
    .select('Reviews.*', 'User.*') // Select specific user fields as needed
    .where('Reviews.productId', id)
    .then(reviews => {
      if (reviews.length) {
        res.json(reviews);
      } else {
        res.status(404).json({ error: 'Reviews not found' });
      }
    })
    .catch(error => {
      console.error('Error getting the reviews:', error);
      res.status(500).json({ error: 'Error getting the reviews' });
    });
});




// DELETE A REVIEW FOR A PRODUCT
app.delete('/reviews/delete', (req, res) => {
  const { reviewId } = req.body;

  // Check for incomplete form submission and validate reviewId
  if (!reviewId || isNaN(reviewId)) {
    return res.status(400).json({ error: 'Incorrect form submission or invalid review ID' });
  }

  db('Reviews').where('reviewId', reviewId).del()
    .then(result => {
      if (result) {
        res.json({ message: 'Review deleted successfully' });
      } else {
        res.status(404).json({ error: 'Review not found' });
      }
    })
    .catch(error => {
      console.error('Error deleting review:', error);
      res.status(500).json({ error: 'Error deleting review' });
    });
});


// ADD A PRODUCT TO THE CURRENT TRUCK
app.post('/truck/add-product', async (req, res) => {
  const { phoneNumber, productId, quantity } = req.body;

  // Check for incomplete form submission
  if (!phoneNumber || !productId || !quantity) {
    return res.status(400).json({ error: 'Incorrect form submission' });
  }

  try {
    // Fetch the userId using the phoneNumber
    const user = await db('user').select('userId').where('phoneNumber', phoneNumber).first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.userId;

    // Fetch the product price using the productId
    const product = await db('product').select('price').where('productId', productId).first();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const totalPrice = product.price * quantity;

    // Check if the product already exists in the current truck
    const existingProduct = await db('currentTruck').where({ productId, userId }).first();

    if (existingProduct) {
      // Update the quantity and total price with the new values
      await db('currentTruck')
        .where({ productId, userId })
        .update({
          quantity: quantity, // Update to the new value
          total_price: totalPrice, // Calculate new total price based on new quantity
        });

      // Fetch the updated row
      const updatedTruckProduct = await db('currentTruck').where({ productId, userId }).first();

      res.json({
        message: "Product quantity updated in truck successfully",
        truckProduct: updatedTruckProduct,
      });
    } else {
      // Insert the product into the currentTruck table if it doesn't exist
      await db('currentTruck').insert({
        productId,
        userId,
        quantity,
        total_price: totalPrice,
      });

      // Fetch the inserted row using a query to ensure uniqueness
      const insertedTruckProduct = await db('currentTruck')
        .where({
          productId,
          userId,
          quantity,
        })
        .orderBy('currentTruckId', 'desc')
        .first();

      if (insertedTruckProduct) {
        res.json({
          message: "Product added to truck successfully",
          truckProduct: insertedTruckProduct,
        });
      } else {
        res.status(404).json({ error: 'Unable to add product into truck' });
      }
    }
  } catch (error) {
    console.error('Error adding product to truck:', error);
    res.status(500).json({ error: 'Error adding product to truck' });
  }
});



// DELETE A PRODUCT FOR A CURRENT TRUCK
app.delete('/truck/remove-product', (req, res) => {
  const { id } = req.body;

  // Check for incomplete form submission and validate reviewId
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Incorrect form submission or invalid currentTruck ID' });
  }

  db('currentTruck').where('currentTruckId', id).del()
    .then(result => {
      if (result) {
        res.json({ message: 'Truck product deleted successfully' });
      } else {
        res.status(404).json({ error: 'Truck product not found' });
      }
    })
    .catch(error => {
      console.error('Error deleting truck product:', error);
      res.status(500).json({ error: 'Error deleting truck product' });
    });
});



// GET ALL THE PRODUCT IN CURRENT TRUCK
app.post('/truck/products', (req, res) => {
  const { phoneNumber } = req.body;

  db.select('userId').from('user').where('phoneNumber', phoneNumber).first()
    .then(user => {
      if (user) {
        return db.select('*').from('currentTruck').where('userId', user.userId);
      } else {
        throw new Error('User not found');
      }
    })
    .then(currentTruckProducts => {
      if (currentTruckProducts.length) {
        const productIds = currentTruckProducts.map(product => product.productId);
        return Promise.all([
          currentTruckProducts,
          db.select('*').from('product').whereIn('productId', productIds)
        ]);
      } else {
        throw new Error('Current truck products not found');
      }
    })
    .then(([currentTruckProducts, productDetails]) => {
      const combinedData = currentTruckProducts.map(truckProduct => {
        const productDetail = productDetails.find(product => product.productId === truckProduct.productId);
        return {
          ...truckProduct,
          ...productDetail
        };
      });
      res.json(combinedData);
    })
    .catch(error => {
      res.status(400).json(error.message || 'Error getting the products');
    });
});




// UPDATE THE QUANTITY OF A TRUCK PRODUCT
app.put('/truck/update-quantity', (req, res) => {
  const { userId, productId, quantity } = req.body;

  // Check for incomplete form submission
  if (!userId || !productId || !quantity || isNaN(quantity) || quantity < 0) {
    return res.status(400).json({ error: 'Incorrect form submission or invalid quantity' });
  }

  db('currentTruck')
    .where({ userId: userId, productId: productId })
    .update({ quantity: quantity })
    .then(result => {
      if (result) {
        res.json({ message: 'Quantity updated successfully' });
      } else {
        res.status(404).json({ error: 'Product not found in truck' });
      }
    })
    .catch(error => {
      console.error('Error updating product quantity:', error);
      res.status(500).json({ error: 'Error updating product quantity' });
    });
});


// GET TOP 10 PRODUCTS WITH HIGH RATINGS
app.get('/promotions/highly-rated', async (req, res) => {
  try {
    const topRatedProducts = await db('product')
      .select('*')
      .orderBy('averageRating', 'desc')
      .limit(10);

    if (topRatedProducts.length) {
      res.json(topRatedProducts);
    } else {
      res.status(404).json({ error: 'No top-rated products found' });
    }
  } catch (error) {
    console.error('Error retrieving top-rated products:', error);
    res.status(500).json({ error: 'Error retrieving top-rated products' });
  }
});



app.get('/promotions/trending', async (req, res) => {
  try {
    const topViewedProducts = await db('Product')
      .select('*')
      .orderBy('views', 'desc')
      .limit(10);

    if (topViewedProducts.length) {
      res.json(topViewedProducts);
    } else {
      res.status(404).json({ error: 'No top-viewed products found' });
    }
  } catch (error) {
    console.error('Error retrieving top-viewed products:', error);
    res.status(500).json({ error: 'Error retrieving top-viewed products' });
  }
});



app.get('/order/track/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const deliveryDetails = await db.select('*').from('delivery').where('trackingNumber', id);
    
    if (!deliveryDetails.length) {
      return res.status(404).json({ error: 'Tracking number not found' });
    }

    if (deliveryDetails[0].deliveryStatus === 'delivered') {
      return res.json({ deliveryDetails, message: 'Products Delivered' });
    }

    if (deliveryDetails[0].deliveryStatus === 'in-progress') {
      const driver = await db.select('*').from('drivers').where('driverId', deliveryDetails[0].driverId);
      
      if (!driver.length) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      return res.json({
        deliveryDetails,
        driverLongitude: driver[0].driverLongitude,
        driverLatitude: driver[0].driverLatitude
      });
    }

  } catch (error) {
    console.error('Error getting tracking number details:', error);
    return res.status(500).json({ error: 'Error getting tracking number details' });
  }
});


// GET ALL THE COMPLETED ORDERS OF A USER BASED ON PHONE NUMBER
// GET ALL THE COMPLETED ORDERS OF A USER BASED ON PHONE NUMBER
app.post('/orders/completed', async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    // Get userId from users table using phoneNumber
    const user = await db.select('userId').from('user').where('phoneNumber', phoneNumber).first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.userId;

    // Get completed orders using userId
    const completedOrders = await db.select('*').from('orders').where({
      userId: userId,
      orderStatus: 'complete'
    });

    if (!completedOrders.length) {
      return res.status(404).json({ error: 'No completed orders found for user' });
    }

    // Get additional information for each completed order
    const ordersWithDetails = await Promise.all(
      completedOrders.map(async (order) => {
        const [address, paymentMethod, shippingMethod] = await Promise.all([
          db.select('*').from('address').where('addressId', order.addressId).first(),
          db.select('*').from('paymentMethod').where('paymentMethodId', order.paymentMethodId).first(),
          db.select('*').from('shippingMethod').where('shippingMethodId', order.shippingMethodId).first()
        ]);

        return {
          ...order,
          address,
          paymentMethod,
          shippingMethod
        };
      })
    );

    res.json(ordersWithDetails);
  } catch (error) {
    console.error('Error getting the orders:', error);
    res.status(500).json({ error: 'Error getting the orders' });
  }
});


// GET ALL THE ORDERS IN PROGRESS OF A USER
app.get('/orders/in-progress/:id', (req, res) => {
  const id = req.params.id;

  db.select('*').from('orders').where('userId', id)
    .then(progressingOrders => {
      if (progressingOrders.length) {
        if(progressingOrders[0].orderStatus === 'progress') {
          res.json(progressingOrders);
        }
        res.json("No orders in progress")
        
      } else {
        res.status(400).json('Orders not found for user');
      }
    })
    .catch(error => {
      res.status(400).json('Error getting the orders');
    });
});


// CANCEL AN ORDER
app.put('/order/cancel', (req, res) => {
  const { orderId } = req.body;

  // Check for incomplete form submission
  if (!orderId || isNaN(orderId)) {
    return res.status(400).json({ error: 'Incorrect form submission or invalid order ID' });
  }

  db('orders')
    .where({ orderId: orderId })
    .update({ orderStatus: 'cancelled' })
    .then(result => {
      if (result) {
        res.json({ message: 'Order cancelled successfully' });
      } else {
        res.status(404).json({ error: 'Order not found or already cancelled' });
      }
    })
    .catch(error => {
      console.error('Error cancelling order:', error);
      res.status(500).json({ error: 'Internal server error while cancelling order' });
    });
});


// GET ALL THE BEST SELLING PRODUCTS
app.get('/best-selling', async (req, res) => {
  try {
    const bestSelling = await db.transaction(async trx => {
      // Aggregate product sales, sort by count in descending order, and limit to top 10
      const bestSellingProducts = await trx('orderProducts')
        .select('productId')
        .count('productId as salesCount')
        .groupBy('productId')
        .orderBy('salesCount', 'desc')
        .limit(10);

      if (bestSellingProducts.length) {
        const productIds = bestSellingProducts.map(item => item.productId);
        const products = await trx('Product').select('*').whereIn('productId', productIds);
        return products;
      } else {
        throw new Error('No best-selling products found');
      }
    });
    res.json(bestSelling);
  } catch (err) {
    console.error('Error fetching best-selling products:', err);
    res.status(500).json({ error: 'Unable to fetch best-selling products' });
  }
});





// // User-related endpoints
// POST /user/update/:id        - Update user details   =============================> COMPLETE
// GET  /user/:id               - Get user details  =================================> COMPLETE

// // Product-related endpoints
// GET  /products/category/:id  - Get all products in a category  ===================> COMPLETE
// POST /products/search        - Search for products  ==============================> COMPLETE
// GET  /products/names         - Get all product names  ============================> COMPLETE
// GET  /products/subcategory/:id - Get all products in a subcategory  ==============> COMPLETE
// GET  /product/:id            - Get product details  ==============================> COMPLETE
// GET  /products               - Get all products  =================================> COMPLETE

// // Category-related endpoints
// GET  /categories             - Get category details  =============================> COMPLETE
// GET  /subcategory/:id        - Get subcategory details associated with a category=> COMPLETE
// GET  /subcategory            - Get subcategory  ==================================> COMPLETE


// // Order-related endpoints
// GET  /order/track/:id        - Track an order  ===================================> COMPLETE
// POST /order/cancel/:id       - Cancel an order  ==================================> COMPLETE
// GET  /orders/in-progress/:id - Get orders in progress  ===========================> COMPLETE
// GET  /orders/completed/:id   - Get completed orders  =============================> COMPLETE

// // Favourites-related endpoints
// POST /favourite/add          - Add to favourites  ================================> COMPLETE
// DELETE /favourite/remove     - Remove from favourites  ===========================> COMPLETE
// GET  /favourites/:id         - Get all favourites for a userId  ==================> COMPLETE

// // Reviews-related endpoints
// GET  /reviews/:id            - Get all reviews for a product  ====================> COMPLETE
// POST /review/add             - Add a review  =====================================> COMPLETE
// DELETE /review/remove        - Remove a review  ==================================> COMPLETE

// // Truck-related endpoints
// POST /truck/add-product      - Add product to current truck =====================> COMPLETE
// DELETE /truck/remove-product - Remove product from current truck  ===============> COMPLETE
// GET  /truck/products/:id     - Get current truck products  ======================> COMPLETE
// POST /truck/update-quantity  - Update product quantity  =========================> COMPLETE

// // Promotion-related endpoints
// GET  /promotions/trending    - Get trending products  ===========================> COMPLETE
// GET  /promotions/best-selling - Get best selling products  ======================> COMPLETE  
// GET  /promotions/highly-rated - Get highly rated products  ======================> COMPLETE
// GET  /promotions/recommendations - Get recommendations

// // Checkout
// POST /checkout               - Checkout

// // Banners
// GET  /banners                - Get banners



app.listen(3005, ()=> {
    console.log('app is running on port 3005');
})