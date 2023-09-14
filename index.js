const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const axios = require('axios');
const session = require('express-session');
const Amadeus =require( "amadeus");





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

//Checks if sign up conditions are valid before storing the data into users table
app.post('/signup', (req, res) => {
  const { username, email, password } = req.body;
  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  db.run(sql, [username, email, password], (err) => {
    if (err) {
      console.error(err);
      res.status(401).send('<script>alert("You have entered a used Username or Email."); window.location.href = "/signup";</script>');
  } else {
      res.redirect('/');
    }
  });
});


//function that requires users to login 
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


const amadeus = new Amadeus({
  clientId: 'WGrGoO7avNljRfzckUNoAYoJWluTUjHm',
  clientSecret: 'oqhWp4htORBWGGGx',
});

//flight search page generation
app.get('/flight/search', requireLogin, (req, res) => {
  res.render('flight-search');
});
//flight api autocomplete search
app.get("/api/autocomplete", async (request, response) => {
  try {
    const { query } = request;
    const { data } = await amadeus.referenceData.locations.get({
      keyword: query.keyword,
      subType: Amadeus.location.city,
    });
    response.json(data);
  } catch (error) {
    console.error(error.response);
    response.json([]);
  }
});
//inspired by amadeus flight API blog HTML5 example
//searches the flights database with the req params
app.get("/api/search", async (request, response) => {
  try {
    const { query } = request;
    console.log(query);
    const { data } = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: query.origin,
      destinationLocationCode: query.destination,
      departureDate: query.departureDate,
      adults: query.adults,
      children: query.children,
      infants: query.infants,
      travelClass: query.travelClass,
      ...(query.returnDate ? { returnDate: query.returnDate } : {}),
    });
    response.json(data);
  } catch (error) {
    console.error(error.response);
    response.json([]);
  }
});

//save selected flight data
app.post('/api/save-flight', (req, res) => {
  const { flightData } = req.body;

  if (!flightData) {
    return res.status(400).json({ message: 'Flight data is missing' });
  }

  // Extract relevant details from flightData
  const flightDetailsToSave = flightData.map((itinerary) => {
    const segments = itinerary.segments.map((segment) => {
      return `${segment.departure.iataCode} → ${segment.arrival.iataCode}`;
    }).join(', ');

    return {
      origin: itinerary.segments[0].departure.iataCode,
      destination: itinerary.segments[itinerary.segments.length - 1].arrival.iataCode,
      duration: itinerary.duration,
      price: itinerary.price,
      travelPath: segments,
    };
  });

  // Insert flight details into the database
  flightDetailsToSave.forEach(async (flightDetail) => {
    const { origin, destination, duration, price, travelPath } = flightDetail;
    const sql = `
      INSERT INTO flightDetails (origin, destination, duration, price, travel_path, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    // Retrieving user_id from the session
    const user_id = req.session.user.user_id;

    try {
      await db.run(sql, [origin, destination, duration, price, travelPath, user_id]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to save flight details' });
    }
  });

  res.json({ message: 'Flight details saved successfully' });
});


///////////////////////saved info on attraction////////
app.get('/saved-flights', requireLogin, (req, res) => {
  const userId = req.session.user.user_id;
  
  // Query the database to retrieve saved attractions for the user
  const selectSql = 'SELECT * FROM flightDetails WHERE user_id = ?';
  db.all(selectSql, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send('Could not retrieve saved attractions.');
    } else {

      // Pass the retrieved data to the saved-attractions EJS template
      res.render('saved-flights',
       {
        savedFlights: rows
       });
    }
  
  });
});


//Route to flight/hotels page
app.get('/hotel/search',requireLogin, (req, res) => {
  res.render('hotel-search');
});

//Route to get hotel search results based on req params
app.post("/hotel/result", requireLogin, (req, res, next) => {
  const userId = req.session.user.user_id;
  const country = req.body.country;
  const { format } = require('date-fns');

  // initiating var for the POST route handler
  const startDate = req.body.startDate;
  const endDate = req.body.endDate;
  
  // Convert the dates to the required format for the API (yyyy-mm-dd)
  const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
  const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');

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
          'X-RapidAPI-Key': '79fbf2ce0emsh88e1a16b0cd5e89p14fc6fjsnbce37d922036',
          'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
        },
       
      };

      axios.request(options)
        .then((response) => {
          
          const geoID = response.data.data.Typeahead_autocomplete.results[3].detailsV2.locationId;

          
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
                  'X-RapidAPI-Key': '79fbf2ce0emsh88e1a16b0cd5e89p14fc6fjsnbce37d922036',
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
                
                const sections = response2.data.data.AppPresentation_queryAppListV2[0].sections;

                const hotels = [];
                            
                for (const sectionKey in sections) {
                  const section = sections[sectionKey];
                  
                  // Check if the section has a listSingleCardContent object to check before pushing the hotel data
                  if (section.listSingleCardContent && typeof section.listSingleCardContent === 'object') {
                    const hotel = {
                      name: section.listSingleCardContent.cardTitle.string,
                      rating: section.listSingleCardContent.bubbleRating ? section.listSingleCardContent.bubbleRating.rating : null,
                      price: section.listSingleCardContent.commerceInfo?.priceForDisplay?.string || 0,
                     
                    };
                    hotels.push(hotel);
                  }
                }

                console.log(hotels);
                // rendering the hotel results
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

//Route to recommendations page
app.get("/recommendations/search",requireLogin, (req, res) => {
  res.render('recommendations-search');
});


//Route to get recommendations results based on the req params
app.post("/recommendations/result", requireLogin, (req, res, next) => {
  const userId = req.session.user.user_id;
  const country = req.body.country;
  const { format } = require('date-fns');
  const pax = req.body.pax;
   //intiating the var for the dates in the POST handler
  const startDate = req.body.startDate; // Assuming format is dd-mm-yyyy
  const endDate = req.body.endDate; // Assuming format is dd-mm-yyyy
  
  // Convert the dates to the required format for the API (yyyy-mm-dd)
  const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
  const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');
  
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
          'X-RapidAPI-Key': '79fbf2ce0emsh88e1a16b0cd5e89p14fc6fjsnbce37d922036',
          'X-RapidAPI-Host': 'travel-advisor.p.rapidapi.com'
        },
       
      };

      axios.request(options)
        .then((response) => {
          
          const geoID = response.data.data.Typeahead_autocomplete.results[3].detailsV2.locationId;

          
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
                  'X-RapidAPI-Key': '79fbf2ce0emsh88e1a16b0cd5e89p14fc6fjsnbce37d922036',
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
                
                const sections = response2.data.data.AppPresentation_queryAppListV2[0].sections;

                const recommendations = [];
                            
                for (const sectionKey in sections) {
                  const section = sections[sectionKey];
                  
                  // Check if the section has a listSingleCardContent object before pushing the recommendations data
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
                // rendering the data into recommendations page
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

//renders planner page
app.get('/planner', (req, res) => {
  //orders the attractions based on day of stay
  const query = `SELECT * FROM attractionDetails ORDER BY day_of_stay, attraction_id`;

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

//changes the dates allocated to the attractions
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

