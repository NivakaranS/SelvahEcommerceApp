const bcrypt = require('bcrypt');

const handleRegister = (req, res, db) => {
    const { firstname, lastname, mobile, gender, dob, mobileOtp, email, password } = req.body;

    // Check for incomplete form submission
    if (!firstname || !lastname || !mobile || !gender || !dob || !mobileOtp || !email || !password) {   
        return res.status(400).json('incorrect form submission');
    }

    // Hash the password with bcrypt
    bcrypt.hash(password, 10, (err, hashedPassword) => { // Salt rounds set to 10
        if (err) {
            console.error(err);
            return res.status(500).json('error hashing password');
        }

        // Start transaction
        db.transaction(trx => {
            trx.insert({
                first_name: firstname,
                last_name: lastname,
                phone: mobile,
                gender: gender,
                dob: dob,
                email: email,
                password: hashedPassword, // Use the hashed password
                registerTimestamp: new Date()
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
    });
}

module.exports = {
    handleRegister: handleRegister
};
