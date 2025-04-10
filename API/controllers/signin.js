const handleSignin = (db, bcrypt) => (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json('incorrect form submission');
    }

    db.select('username', 'password')
      .from('users')
      .where('username', '=', username)
      .then(data => {
          if (data.length === 0) {
              return res.status(401).json('wrong credentials');
          }

          // Use the asynchronous version of compare
          return bcrypt.compare(password, data[0].password)
            .then(isValid => {
                if (isValid) {
                    return db.select('*')
                        .from('users')
                        .where('username', '=', username)
                        .then(user => res.json(user[0]))
                        .catch(err => res.status(400).json('unable to get user'));
                } else {
                    res.status(401).json('wrong credentials');
                }
            })
            .catch(err => res.status(400).json('error comparing password'));
      })
      .catch(err => res.status(400).json('unable to retrieve user'));
};

module.exports = {
    handleSignin: handleSignin
};
