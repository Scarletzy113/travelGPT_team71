const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');


const app = express();
const PORT = 3000;

app.set('view engine','ejs');
// Create or open the SQLite database
db = new sqlite3.Database('./database.db', function (err) {
  if (err) {
    console.error(err);
    process.exit(1); //Bail out we can't connect to the DB
  } else {
    console.log('Database connected');
 db.run('PRAGMA foreign_keys=ON'); //This tells SQLite to pay attention to foreign key constraints
  }
});


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());
app.use(session({
  secret:"secret-key",
  resave: false,
  saveUninitialized: true,
}));


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// Routes to login
app.get('/', (req, res) => {
  res.render('homePage');
});

app.get('/login', (req, res) => {
    res.render('login');
  });

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.get(sql, [username, password], (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).send('Could not log in.');
    } else if (!row) {
      res.status(401).send('Invalid credentials.');
    } else {
      // Set up the user data in session
      req.session.user = {
        user_id: row.user_id,
        username: row.username,
        email: row.email,
        country: row.country,
        geoId: row.geoId
      };
      
      res.redirect('/');
    }
  });
});

//Route to sign up 
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;
  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  db.run(sql, [username, email, password], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Could not register user.');
    } else {
      res.redirect('/');
    }
  });
});



function requireLogin(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

//Route to flight/hotels page
app.get('/flight/search',requireLogin, (req, res) => {
  res.render('flight-search');
});


//Route to flight/hotels page
app.get('/hotel/search',requireLogin, (req, res) => {
  res.render('hotel-search');
});

// app.post("/hotel/result", requireLogin, (req, res, next) => {
//   const userId = req.session.user.user_id;
//   const country = req.body.country;

//   // Corrected SQL syntax for updating user's country
//   const updateUserSql = "UPDATE users SET country = ? WHERE user_id = ?";
//   const userData = [country, userId];

//   global.db.run(updateUserSql, userData, function (err) {
//     if (err) {
//       next(err); // Send the error on to the error handler
//     } else {
//       console.log(`User's country updated for user ID ${userId}`);

//       const options = {
//         method: 'POST',
//         url: 'https://travel-advisor.p.rapidapi.com/locations/v2/search',
//         params: {
//           currency: 'USD',
//           units: 'km',
//           lang: 'en_US'
//         },
//         headers: {
//           'content-type': 'application/json',
//           'X-RapidAPI-Key': 'b519162a41msh5b10209e96c5027p107049jsn63c119b6732e',
//           'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
//         },
//         data: {
//           query: country, // Use the country value here
//           updateToken: ''
//         }
//       };

//       axios.request(options)
//         .then((response) => {
//           const geoID = response.appSearchCardContent.saveId.id;

//           // Corrected SQL syntax for updating user's geoID
//           const updateGeoIDSql = "UPDATE users SET geoID = ? WHERE user_id = ?";
//           const geoIDData = [geoID, userId];

//           global.db.run(updateGeoIDSql, geoIDData, function (err) {
//             if (err) {
//               next(err); // Send the error on to the error handler
//             } else {
//               console.log(`User's geoID updated for user ID ${userId}`);
//             }
//           });
//         })
//         .catch((error) => {
//           next(error); // Handle API request error
//         });
//     }
//   });
// });

// ... (Other imports and app setup code)

app.post("/hotel/result", requireLogin, (req, res, next) => {
  const userId = req.session.user.user_id;
  const country = req.body.country;

  // Corrected SQL syntax for updating user's country
  const updateUserSql = "UPDATE users SET country = ? WHERE user_id = ?";
  const userData = [country, userId];

  db.run(updateUserSql, userData, function (err) {
    if (err) {
      next(err); // Send the error on to the error handler
    } else {
      console.log(`User's country updated for user ID ${userId}`);

      const options = {
        method: 'GET',
        url: 'https://travel-advisor.p.rapidapi.com/locations/v2/auto-complete',
        params: {
          query: 'eiffel tower',
          lang: 'en_US',
          units: 'km'
        },
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': 'b519162a41msh5b10209e96c5027p107049jsn63c119b6732e',
          'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
        },
        params: {
          query: country,
          lang: 'en_US',
          units: 'km'
        }
      };

      axios.request(options)
        .then((response) => {
          console.log(response);
          const geoID = response.data.Typeahead_autocomplete.results[4].detailsV2.locationId;

          // Corrected SQL syntax for updating user's geoID
          const updateGeoIDSql = "UPDATE users SET geoId = ? WHERE user_id = ?";
          const geoIDData = [geoID, userId];

          db.run(updateGeoIDSql, geoIDData, function (err) {
            if (err) {
              next(err); // Send the error on to the error handler
            } else {
              console.log(`User's geoId updated for user ID ${userId}`);
              res.render('result', { geoID }); // Render a result page with the extracted geoID
            }
          });
        })
        .catch((error) => {
          next(error); // Handle API request error
        });
    }
  });
});

// ... (Other routes and app.listen)

