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
app.use(bodyParser.json());
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


var maxDays = 3;

///////////////////////saved info on attraction////////
app.get('/saved-attractions', requireLogin, (req, res) => {
  const userId = req.session.user.user_id;
  
  // Query the database to retrieve saved attractions for the user
  const selectSql = 'SELECT * FROM attractionDetails WHERE user_id = ?';
  db.all(selectSql, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Could not retrieve saved attractions.');
    } else {

              // Pass the retrieved data to the saved-attractions EJS template
      res.render('saved-attractions',
       {
        savedAttractions: rows,
        maxDays: maxDays,
       });
    }
  
  });
});
//////////////save-attraction////////////////////
app.post('/save-attraction', requireLogin, (req, res) => {
  const userId = req.session.user.user_id;
  
  const attractionName = req.body.attractionName;
  const attractionRating = req.body.attractionRating;
  const attractionPrice = req.body.attractionPrice;
  const attractionImageUrl = req.body.attractionImageURL;

  console.log('Attempting to save attraction:', userId,attractionName,attractionRating,attractionPrice,attractionImageUrl);
  // console.log('Attraction ID:', attractionId);

  // Insert the saved attraction into the user-saved data table in the database
  const insertSql = 'INSERT INTO attractionDetails (user_id,attraction_name,rating,price,imageURL ) VALUES (?, ? , ? , ? , ?)';
  db.run(insertSql, [userId, attractionName,attractionRating,attractionPrice,attractionImageUrl], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Could not save attraction.');
    } else {
      console.log(`Attraction saved for user ID ${userId}:${attractionName}:${attractionRating}:${attractionPrice}:${attractionImageUrl}`);
      
    }
  });
});






////////////////////////saved info on attraction////////
app.get('/saved-hotel', requireLogin, (req, res) => {
  const userId = req.session.user.user_id;

  // Query the database to retrieve saved attractions for the user
  const selectSql = 'SELECT * FROM hotelDetails WHERE user_id = ?';
  db.all(selectSql, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Could not retrieve saved hotels.');
    } else {

              // Pass the retrieved data to the saved-attractions EJS template
      res.render('saved-hotel',
       {
        savedHotels: rows,
       });
    }
  
  });
});
//////////////save-hotel////////////////////
app.post('/save-hotel', requireLogin, (req, res) => {
  const userId = req.session.user.user_id;
  
  const hotelName = req.body.hotelName;
  const hotelRating = req.body.hotelRating;
  const hotelPrice = req.body.hotelPrice;

  console.log('Attempting to save hotel:', userId,hotelName,hotelRating,hotelPrice);

  // Insert the saved attraction into the user-saved data table in the database
  const insertSql = 'INSERT INTO hotelDetails (user_id,hotel_name,rating,price) VALUES (?, ?, ?, ?)';
  db.run(insertSql, [userId, hotelName,hotelRating,hotelPrice], (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Could not save hotel.');
    } else {
      console.log(`Hotel saved for user ID ${userId}:${hotelName}:${hotelRating}:${hotelPrice}`);
      
    }
  });
});


//Route to flight/hotels page
app.get('/flight/search',requireLogin, (req, res) => {
  res.render('flight-search');
});


//Route to flight/hotels page
app.get('/hotel/search',requireLogin, (req, res) => {
  res.render('hotel-search');
});

app.post("/hotel/result", requireLogin, (req, res, next) => {
  const userId = req.session.user.user_id;
  const country = req.body.country;
  const { format } = require('date-fns');

  // Inside your POST route handler
  const startDate = req.body.startDate; // Assuming format is dd-mm-yyyy
  const endDate = req.body.endDate; // Assuming format is dd-mm-yyyy
  
  // Convert the dates to the required format (yyyy-mm-dd)
  const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
  const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');

  


  // Corrected SQL syntax for updating user's country
  const updateUserSql = "UPDATE users SET country = ? WHERE user_id = ?";
  const userData = [country, userId];

  db.run(updateUserSql, userData, function (err) {
    if (err) {
      next(err); // Send the error on to the error handler
    } else {
      console.log(`User's country updated for user ID ${userId}`);
      console.log(`country saved ${country}`);
      const options = {
        method: 'GET',
        url: 'https://travel-advisor.p.rapidapi.com/locations/v2/auto-complete',
        params: {
          query: country,
          lang: 'en_US',
          units: 'km'
        },
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': 'b519162a41msh5b10209e96c5027p107049jsn63c119b6732e',
          'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
        },
       
      };

      axios.request(options)
        .then((response) => {
          
          const geoID = response.data.data.Typeahead_autocomplete.results[3].detailsV2.locationId;

          // Corrected SQL syntax for updating user's geoID
          const updateGeoIDSql = "UPDATE users SET geoId = ? WHERE user_id = ?";
          const geoIDData = [geoID, userId];

          db.run(updateGeoIDSql, geoIDData, function (err) {
            if (err) {
              next(err); // Send the error on to the error handler
            } else {
              console.log(`User's geoId updated for user ID ${userId} with geoId: ${geoID}`);

              const options2 = {
                method: 'POST',
                url: 'https://travel-advisor.p.rapidapi.com/hotels/v2/list',
                params: {
                  currency: 'USD',
                  units: 'km',
                  lang: 'en_US'
                },
                headers: {
                  'content-type': 'application/json',
                  'X-RapidAPI-Key': 'b519162a41msh5b10209e96c5027p107049jsn63c119b6732e',
                  'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
                },
                data: {
                  geoId: geoID,
                  checkIn: `${formattedStartDate}`,
                  checkOut: `${formattedEndDate}`,
                  sort: 'PRICE_LOW_TO_HIGH',
                  sortOrder: 'asc',
                  rooms: [
                    {
                        "adults": 2,
                        "childrenAges": [
                            2
                        ]
                    },
                    {
                        "adults": 2,
                        "childrenAges": [
                            3
                        ]
                    }
                ],
                  updateToken: ''
                }
              };
              axios.request(options2)
              .then((response2) => {
                // console.log(formattedStartDate);
                // console.log(formattedEndDate);
                const sections = response2.data.data.AppPresentation_queryAppListV2[0].sections;

                const hotels = [];
                            
                for (const sectionKey in sections) {
                  const section = sections[sectionKey];
                  
                  // Check if the section has a listSingleCardContent object
                  if (section.listSingleCardContent && typeof section.listSingleCardContent === 'object') {
                    const hotel = {
                      name: section.listSingleCardContent.cardTitle.string,
                      rating: section.listSingleCardContent.bubbleRating ? section.listSingleCardContent.bubbleRating.rating : null,
                      price: section.listSingleCardContent.commerceInfo?.priceForDisplay?.string || 0,
                      // Add more fields as needed
                    };
                    hotels.push(hotel);
                  }
                }

                console.log(hotels);
                // Pass the hotels array to your EJS template
                res.render('hotel-result', { hotels });
                })
             
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
app.get("/recommendations/search",requireLogin, (req, res) => {
  res.render('recommendations-search');
});



app.post("/recommendations/result", requireLogin, (req, res, next) => {
  const userId = req.session.user.user_id;
  const country = req.body.country;
  const { format } = require('date-fns');
  const pax = req.body.pax;
  // Inside your POST route handler
  const startDate = req.body.startDate; // Assuming format is dd-mm-yyyy
  const endDate = req.body.endDate; // Assuming format is dd-mm-yyyy
  
  // Convert the dates to the required format (yyyy-mm-dd)
  const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
  const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');

  


  // Corrected SQL syntax for updating user's country
  const updateUserSql = "UPDATE users SET country = ? WHERE user_id = ?";
  const userData = [country, userId];

  db.run(updateUserSql, userData, function (err) {
    if (err) {
      next(err); // Send the error on to the error handler
    } else {
      console.log(`User's country updated for user ID ${userId}`);
      console.log(`country saved ${country}`);
      const options = {
        method: 'GET',
        url: 'https://travel-advisor.p.rapidapi.com/locations/v2/auto-complete',
        params: {
          query: country,
          lang: 'en_US',
          units: 'km'
        },
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': 'b519162a41msh5b10209e96c5027p107049jsn63c119b6732e',
          'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
        },
       
      };

      axios.request(options)
        .then((response) => {
          
          const geoID = response.data.data.Typeahead_autocomplete.results[3].detailsV2.locationId;

          // Corrected SQL syntax for updating user's geoID
          const updateGeoIDSql = "UPDATE users SET geoId = ? WHERE user_id = ?";
          const geoIDData = [geoID, userId];

          db.run(updateGeoIDSql, geoIDData, function (err) {
            if (err) {
              next(err); // Send the error on to the error handler
            } else {
              console.log(`User's geoId updated for user ID ${userId} with geoId: ${geoID}`);

              const options2 = {
                method: 'POST',
                url: 'https://travel-advisor.p.rapidapi.com/attractions/v2/list',
                params: {
                  currency: 'USD',
                  units: 'km',
                  lang: 'en_US'
                },
                headers: {
                  'content-type': 'application/json',
                  'X-RapidAPI-Key': 'b519162a41msh5b10209e96c5027p107049jsn63c119b6732e',
                  'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
                },
                data: {
                  geoId: geoID,
                  startDate: `${formattedStartDate}`,
                  endDate: `${formattedEndDate}`,
                  pax: [
                    {
                      ageBand: 'ADULT',
                      count: pax
                    }
                  ],
                  sort: 'TRAVELER_FAVORITE_V2',
                  sortOrder: 'asc',
                  updateToken: ''
                }
              };
              
              axios.request(options2)
              .then((response2) => {
                // console.log(formattedStartDate);
                // console.log(formattedEndDate);
                const sections = response2.data.data.AppPresentation_queryAppListV2[0].sections;

                const recommendations = [];
                            
                for (const sectionKey in sections) {
                  const section = sections[sectionKey];
                  
                  // Check if the section has a listSingleCardContent object
                  if (section.listSingleCardContent && typeof section.listSingleCardContent === 'object') {
                    const recommendation = {
                      name: section.listSingleCardContent.cardTitle.string,
                      rating: section.listSingleCardContent.bubbleRating ? section.listSingleCardContent.bubbleRating.rating : null,
                      price: section.listSingleCardContent.merchandisingText?.htmlString?.string || 0,
                      image: section.listSingleCardContent.cardPhoto.sizes.urlTemplate.replace('{width}',300).replace('{height}',200),
                      
                      // Add more fields as needed
                    };
                    recommendations.push(recommendation);
                  }
                }

                console.log(recommendations);
                // Pass the hotels array to your EJS template
                res.render('recommendations', { recommendations });
                })
             
            }
          });
        })
        .catch((error) => {
          next(error); // Handle API request error
        });
    }
  });

});


app.get('/planner', (req, res) => {
  const query = `
      SELECT * FROM attractionDetails
      ORDER BY day_of_stay, attraction_id
  `;

  db.all(query, [], (err, rows) => {
      if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
          return;
      }

       // Initial value or any default value
      if (req.query.maxDays) {
          maxDays = parseInt(req.query.maxDays);
          if (isNaN(maxDays) || maxDays <= 0) {
              maxDays = 3; // Reset to default if invalid input
          }
      }

      const attractionsByDay = {};
      rows.forEach(attraction => {
          const day = attraction.day_of_stay;
          if (day !== null) {
              if (!attractionsByDay[day]) {
                  attractionsByDay[day] = [];
              }
              attractionsByDay[day].push(attraction);
          }
      });

      res.render('planner.ejs', {
          attractionsByDay: attractionsByDay,
          maxDays: maxDays,
      });
  });
});


app.post('/allocate', (req, res) => {
  const attractionId = req.body.attraction_id;
  const selectedDay = req.body.daySelect;

  // Update the database with the selected day_of_stay for the attraction
  const updateQuery = `
      UPDATE attractionDetails
      SET day_of_stay = ?
      WHERE attraction_id = ?
  `;

  db.run(updateQuery, [selectedDay, attractionId], (err) => {
      if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
          return;
      }

      // Redirect back to the attractions page after allocation
      res.redirect('/saved-attractions');
  });
});

