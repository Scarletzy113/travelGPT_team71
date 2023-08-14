
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

--create your tables with SQL commands here (watch out for slight syntactical differences with SQLite)


CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hotelDetails (
  hotel_id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_name TEXT NOT NULL,
  number_of_days INT NOT NULL,
  number_of_adults INT,
  number_of_children INT,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS attractionDetails (
  attraction_id INTEGER PRIMARY KEY AUTOINCREMENT,
  attraction_name TEXT NOT NULL,
  day_of_stay INT NOT NULL,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);
  

COMMIT;

