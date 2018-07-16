/**
 * Common database helper functions.
 */
class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static openDB() {
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }

    return idb.open('mws', 1, (upgradeDB) => {
      switch(upgradeDB.oldVersion) {
        case 0:
          let restaurantsStore = upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
          restaurantsStore.createIndex('cuisine_type', 'cuisine_type', {unique: false});
          restaurantsStore.createIndex('neighborhood', 'neighborhood', {unique: false});
        case 1:
          let reviewsStore = upgradeDB.createObjectStore('reviews', {keyPath: 'id', autoIncrement: true});
      }
    });
  }

  static fetchRestaurants(callback) {

    const dbPromise = DBHelper.openDB();

    const url = DBHelper.DATABASE_URL;

    fetch(url)
      .then(response => response.json())
      .then(restaurantsJson => {
        callback(null, restaurantsJson);
        DBHelper.saveRestaurantsLocally(restaurantsJson)
          .catch((err) => console.warn(err));
      })
      .catch(err => {
        console.log(`Request failed. Error returned: ${err}`);
        dbPromise
          .then((db) => {
            console.log('calling database');
            const tx = db.transaction('restaurants', 'readonly');
            const store = tx.objectStore('restaurants');
            return store.getAll();
          })
          .then(restaurants => callback(null, restaurants))
          .catch(err => callback(err, null));
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   *  Store restaurants in local IDB
   */
  static saveRestaurantsLocally(restaurants) {
    if (!('indexedDB' in window)) {return null;}
    const dbPromise = DBHelper.openDB();

    return dbPromise.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');
      return Promise.all(restaurants.map(restaurant => store.put(restaurant)))
      .catch(err => {
        throw Error("could not store restaurants in database");
      })
    });
  }

  /**
   * Fetch all reviews with proper error handling
   */
   static fetchReviews(callback) {

    DBHelper.getServerReviews()
      .then(reviewsFromNetwork => {
        console.log("Getting reviews from network");
        callback(null, reviewsFromNetwork);
        DBHelper.saveReviewsLocally(reviewsFromNetwork)
          .then(() => console.log('Data from network saved in local store'))
          .catch((err) => console.warn(err));
      })
      .catch(err => {
        console.log('Network requests have failed, this is expected if offline');
        DBHelper.getLocalReviews()
          .then(offlineData => {
            if (!offlineData.length) {
              console.log("No data");
            } else {
              callback(null, offlineData);
            }
          });
      });
  }

  /**
   * Fetch reviews by restaurant
   */
   static fetchReviewsByRestaurant(restaurant_id, callback) {
    // Fetch all restaurants
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter reviews with a specific restaurant id
        const results = reviews.filter(r => r.restaurant_id == restaurant_id);
        callback(null, results);
      }
    });
   }

   /**
    * Get reviews from server
    */
    static getServerReviews() {
      return fetch('http://localhost:1337/reviews')
        .then(response => {
          if (!response.ok) {
            throw Error(response.statusText);
          }
          return response.json();
        })
    }

   /**
   * Save reviews in IndexedDB
   */
   static saveReviewsLocally(reviews) {
    if (!('indexedDB' in window)) {return null;}
    const dbPromise = DBHelper.openDB();

    return dbPromise.then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      return Promise.all(reviews.map(review => store.put(review)))
        .catch((err) => {
          throw Error('Reviews were not added to the store: ' + err);
        })
    });
   }

   /**
   *  Get reviews from local database
   */
   static getLocalReviews() {
    if (!('indexedDB' in window)) {return null;}
    return DBHelper.openDB().then(db => {
      const tx = db.transaction('reviews', 'readonly');
      const store = tx.objectStore('reviews');
      return store.getAll();
    });
   }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Restaurant reviews URL
   */
   static urlForReviews(restaurant) {
    return (`./reviews/?restaurant_id=${restaurant.id}`);
   }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
