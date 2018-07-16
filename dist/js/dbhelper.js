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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJkYmhlbHBlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ29tbW9uIGRhdGFiYXNlIGhlbHBlciBmdW5jdGlvbnMuXHJcbiAqL1xyXG5jbGFzcyBEQkhlbHBlciB7XHJcbiAgLyoqXHJcbiAgICogRGF0YWJhc2UgVVJMLlxyXG4gICAqIENoYW5nZSB0aGlzIHRvIHJlc3RhdXJhbnRzLmpzb24gZmlsZSBsb2NhdGlvbiBvbiB5b3VyIHNlcnZlci5cclxuICAgKi9cclxuICBzdGF0aWMgZ2V0IERBVEFCQVNFX1VSTCgpIHtcclxuICAgIGNvbnN0IHBvcnQgPSAxMzM3IC8vIENoYW5nZSB0aGlzIHRvIHlvdXIgc2VydmVyIHBvcnRcclxuICAgIHJldHVybiBgaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L3Jlc3RhdXJhbnRzYDtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBvcGVuREIoKSB7XHJcbiAgICBpZiAoISgnaW5kZXhlZERCJyBpbiB3aW5kb3cpKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdUaGlzIGJyb3dzZXIgZG9lc25cXCd0IHN1cHBvcnQgSW5kZXhlZERCJyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaWRiLm9wZW4oJ213cycsIDEsICh1cGdyYWRlREIpID0+IHtcclxuICAgICAgc3dpdGNoKHVwZ3JhZGVEQi5vbGRWZXJzaW9uKSB7XHJcbiAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgbGV0IHJlc3RhdXJhbnRzU3RvcmUgPSB1cGdyYWRlREIuY3JlYXRlT2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJywge2tleVBhdGg6ICdpZCd9KTtcclxuICAgICAgICAgIHJlc3RhdXJhbnRzU3RvcmUuY3JlYXRlSW5kZXgoJ2N1aXNpbmVfdHlwZScsICdjdWlzaW5lX3R5cGUnLCB7dW5pcXVlOiBmYWxzZX0pO1xyXG4gICAgICAgICAgcmVzdGF1cmFudHNTdG9yZS5jcmVhdGVJbmRleCgnbmVpZ2hib3Job29kJywgJ25laWdoYm9yaG9vZCcsIHt1bmlxdWU6IGZhbHNlfSk7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgbGV0IHJldmlld3NTdG9yZSA9IHVwZ3JhZGVEQi5jcmVhdGVPYmplY3RTdG9yZSgncmV2aWV3cycsIHtrZXlQYXRoOiAnaWQnLCBhdXRvSW5jcmVtZW50OiB0cnVlfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudHMoY2FsbGJhY2spIHtcclxuXHJcbiAgICBjb25zdCBkYlByb21pc2UgPSBEQkhlbHBlci5vcGVuREIoKTtcclxuXHJcbiAgICBjb25zdCB1cmwgPSBEQkhlbHBlci5EQVRBQkFTRV9VUkw7XHJcblxyXG4gICAgZmV0Y2godXJsKVxyXG4gICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXHJcbiAgICAgIC50aGVuKHJlc3RhdXJhbnRzSnNvbiA9PiB7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudHNKc29uKTtcclxuICAgICAgICBEQkhlbHBlci5zYXZlUmVzdGF1cmFudHNMb2NhbGx5KHJlc3RhdXJhbnRzSnNvbilcclxuICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiBjb25zb2xlLndhcm4oZXJyKSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBSZXF1ZXN0IGZhaWxlZC4gRXJyb3IgcmV0dXJuZWQ6ICR7ZXJyfWApO1xyXG4gICAgICAgIGRiUHJvbWlzZVxyXG4gICAgICAgICAgLnRoZW4oKGRiKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjYWxsaW5nIGRhdGFiYXNlJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oJ3Jlc3RhdXJhbnRzJywgJ3JlYWRvbmx5Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgICAgICAgIHJldHVybiBzdG9yZS5nZXRBbGwoKTtcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICAudGhlbihyZXN0YXVyYW50cyA9PiBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50cykpXHJcbiAgICAgICAgICAuY2F0Y2goZXJyID0+IGNhbGxiYWNrKGVyciwgbnVsbCkpO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGEgcmVzdGF1cmFudCBieSBpdHMgSUQuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5SWQoaWQsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBmZXRjaCBhbGwgcmVzdGF1cmFudHMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IHJlc3RhdXJhbnQgPSByZXN0YXVyYW50cy5maW5kKHIgPT4gci5pZCA9PSBpZCk7XHJcbiAgICAgICAgaWYgKHJlc3RhdXJhbnQpIHsgLy8gR290IHRoZSByZXN0YXVyYW50XHJcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXN0YXVyYW50KTtcclxuICAgICAgICB9IGVsc2UgeyAvLyBSZXN0YXVyYW50IGRvZXMgbm90IGV4aXN0IGluIHRoZSBkYXRhYmFzZVxyXG4gICAgICAgICAgY2FsbGJhY2soJ1Jlc3RhdXJhbnQgZG9lcyBub3QgZXhpc3QnLCBudWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggcmVzdGF1cmFudHMgYnkgYSBjdWlzaW5lIHR5cGUgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoUmVzdGF1cmFudEJ5Q3Vpc2luZShjdWlzaW5lLCBjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzICB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZ1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBGaWx0ZXIgcmVzdGF1cmFudHMgdG8gaGF2ZSBvbmx5IGdpdmVuIGN1aXNpbmUgdHlwZVxyXG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSByZXN0YXVyYW50cy5maWx0ZXIociA9PiByLmN1aXNpbmVfdHlwZSA9PSBjdWlzaW5lKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXN1bHRzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCByZXN0YXVyYW50cyBieSBhIG5laWdoYm9yaG9vZCB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlOZWlnaGJvcmhvb2QobmVpZ2hib3Job29kLCBjYWxsYmFjaykge1xyXG4gICAgLy8gRmV0Y2ggYWxsIHJlc3RhdXJhbnRzXHJcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRzKChlcnJvciwgcmVzdGF1cmFudHMpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEZpbHRlciByZXN0YXVyYW50cyB0byBoYXZlIG9ubHkgZ2l2ZW4gbmVpZ2hib3Job29kXHJcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3RhdXJhbnRzLmZpbHRlcihyID0+IHIubmVpZ2hib3Job29kID09IG5laWdoYm9yaG9vZCk7XHJcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdWx0cyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggcmVzdGF1cmFudHMgYnkgYSBjdWlzaW5lIGFuZCBhIG5laWdoYm9yaG9vZCB3aXRoIHByb3BlciBlcnJvciBoYW5kbGluZy5cclxuICAgKi9cclxuICBzdGF0aWMgZmV0Y2hSZXN0YXVyYW50QnlDdWlzaW5lQW5kTmVpZ2hib3Job29kKGN1aXNpbmUsIG5laWdoYm9yaG9vZCwgY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgcmVzdWx0cyA9IHJlc3RhdXJhbnRzXHJcbiAgICAgICAgaWYgKGN1aXNpbmUgIT0gJ2FsbCcpIHsgLy8gZmlsdGVyIGJ5IGN1aXNpbmVcclxuICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuY3Vpc2luZV90eXBlID09IGN1aXNpbmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmVpZ2hib3Job29kICE9ICdhbGwnKSB7IC8vIGZpbHRlciBieSBuZWlnaGJvcmhvb2RcclxuICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcihyID0+IHIubmVpZ2hib3Job29kID09IG5laWdoYm9yaG9vZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIGFsbCBuZWlnaGJvcmhvb2RzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nLlxyXG4gICAqL1xyXG4gIHN0YXRpYyBmZXRjaE5laWdoYm9yaG9vZHMoY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBHZXQgYWxsIG5laWdoYm9yaG9vZHMgZnJvbSBhbGwgcmVzdGF1cmFudHNcclxuICAgICAgICBjb25zdCBuZWlnaGJvcmhvb2RzID0gcmVzdGF1cmFudHMubWFwKCh2LCBpKSA9PiByZXN0YXVyYW50c1tpXS5uZWlnaGJvcmhvb2QpXHJcbiAgICAgICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXMgZnJvbSBuZWlnaGJvcmhvb2RzXHJcbiAgICAgICAgY29uc3QgdW5pcXVlTmVpZ2hib3Job29kcyA9IG5laWdoYm9yaG9vZHMuZmlsdGVyKCh2LCBpKSA9PiBuZWlnaGJvcmhvb2RzLmluZGV4T2YodikgPT0gaSlcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB1bmlxdWVOZWlnaGJvcmhvb2RzKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGZXRjaCBhbGwgY3Vpc2luZXMgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmcuXHJcbiAgICovXHJcbiAgc3RhdGljIGZldGNoQ3Vpc2luZXMoY2FsbGJhY2spIHtcclxuICAgIC8vIEZldGNoIGFsbCByZXN0YXVyYW50c1xyXG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50cygoZXJyb3IsIHJlc3RhdXJhbnRzKSA9PiB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBHZXQgYWxsIGN1aXNpbmVzIGZyb20gYWxsIHJlc3RhdXJhbnRzXHJcbiAgICAgICAgY29uc3QgY3Vpc2luZXMgPSByZXN0YXVyYW50cy5tYXAoKHYsIGkpID0+IHJlc3RhdXJhbnRzW2ldLmN1aXNpbmVfdHlwZSlcclxuICAgICAgICAvLyBSZW1vdmUgZHVwbGljYXRlcyBmcm9tIGN1aXNpbmVzXHJcbiAgICAgICAgY29uc3QgdW5pcXVlQ3Vpc2luZXMgPSBjdWlzaW5lcy5maWx0ZXIoKHYsIGkpID0+IGN1aXNpbmVzLmluZGV4T2YodikgPT0gaSlcclxuICAgICAgICBjYWxsYmFjayhudWxsLCB1bmlxdWVDdWlzaW5lcyk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogIFN0b3JlIHJlc3RhdXJhbnRzIGluIGxvY2FsIElEQlxyXG4gICAqL1xyXG4gIHN0YXRpYyBzYXZlUmVzdGF1cmFudHNMb2NhbGx5KHJlc3RhdXJhbnRzKSB7XHJcbiAgICBpZiAoISgnaW5kZXhlZERCJyBpbiB3aW5kb3cpKSB7cmV0dXJuIG51bGw7fVxyXG4gICAgY29uc3QgZGJQcm9taXNlID0gREJIZWxwZXIub3BlbkRCKCk7XHJcblxyXG4gICAgcmV0dXJuIGRiUHJvbWlzZS50aGVuKGRiID0+IHtcclxuICAgICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbigncmVzdGF1cmFudHMnLCAncmVhZHdyaXRlJyk7XHJcbiAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoJ3Jlc3RhdXJhbnRzJyk7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChyZXN0YXVyYW50cy5tYXAocmVzdGF1cmFudCA9PiBzdG9yZS5wdXQocmVzdGF1cmFudCkpKVxyXG4gICAgICAuY2F0Y2goZXJyID0+IHtcclxuICAgICAgICB0aHJvdyBFcnJvcihcImNvdWxkIG5vdCBzdG9yZSByZXN0YXVyYW50cyBpbiBkYXRhYmFzZVwiKTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmV0Y2ggYWxsIHJldmlld3Mgd2l0aCBwcm9wZXIgZXJyb3IgaGFuZGxpbmdcclxuICAgKi9cclxuICAgc3RhdGljIGZldGNoUmV2aWV3cyhjYWxsYmFjaykge1xyXG5cclxuICAgIERCSGVscGVyLmdldFNlcnZlclJldmlld3MoKVxyXG4gICAgICAudGhlbihyZXZpZXdzRnJvbU5ldHdvcmsgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiR2V0dGluZyByZXZpZXdzIGZyb20gbmV0d29ya1wiKTtcclxuICAgICAgICBjYWxsYmFjayhudWxsLCByZXZpZXdzRnJvbU5ldHdvcmspO1xyXG4gICAgICAgIERCSGVscGVyLnNhdmVSZXZpZXdzTG9jYWxseShyZXZpZXdzRnJvbU5ldHdvcmspXHJcbiAgICAgICAgICAudGhlbigoKSA9PiBjb25zb2xlLmxvZygnRGF0YSBmcm9tIG5ldHdvcmsgc2F2ZWQgaW4gbG9jYWwgc3RvcmUnKSlcclxuICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiBjb25zb2xlLndhcm4oZXJyKSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdOZXR3b3JrIHJlcXVlc3RzIGhhdmUgZmFpbGVkLCB0aGlzIGlzIGV4cGVjdGVkIGlmIG9mZmxpbmUnKTtcclxuICAgICAgICBEQkhlbHBlci5nZXRMb2NhbFJldmlld3MoKVxyXG4gICAgICAgICAgLnRoZW4ob2ZmbGluZURhdGEgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIW9mZmxpbmVEYXRhLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTm8gZGF0YVwiKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCBvZmZsaW5lRGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZldGNoIHJldmlld3MgYnkgcmVzdGF1cmFudFxyXG4gICAqL1xyXG4gICBzdGF0aWMgZmV0Y2hSZXZpZXdzQnlSZXN0YXVyYW50KHJlc3RhdXJhbnRfaWQsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBGZXRjaCBhbGwgcmVzdGF1cmFudHNcclxuICAgIERCSGVscGVyLmZldGNoUmV2aWV3cygoZXJyb3IsIHJldmlld3MpID0+IHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEZpbHRlciByZXZpZXdzIHdpdGggYSBzcGVjaWZpYyByZXN0YXVyYW50IGlkXHJcbiAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJldmlld3MuZmlsdGVyKHIgPT4gci5yZXN0YXVyYW50X2lkID09IHJlc3RhdXJhbnRfaWQpO1xyXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3VsdHMpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgfVxyXG5cclxuICAgLyoqXHJcbiAgICAqIEdldCByZXZpZXdzIGZyb20gc2VydmVyXHJcbiAgICAqL1xyXG4gICAgc3RhdGljIGdldFNlcnZlclJldmlld3MoKSB7XHJcbiAgICAgIHJldHVybiBmZXRjaCgnaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jldmlld3MnKVxyXG4gICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcclxuICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IocmVzcG9uc2Uuc3RhdHVzVGV4dCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAvKipcclxuICAgKiBTYXZlIHJldmlld3MgaW4gSW5kZXhlZERCXHJcbiAgICovXHJcbiAgIHN0YXRpYyBzYXZlUmV2aWV3c0xvY2FsbHkocmV2aWV3cykge1xyXG4gICAgaWYgKCEoJ2luZGV4ZWREQicgaW4gd2luZG93KSkge3JldHVybiBudWxsO31cclxuICAgIGNvbnN0IGRiUHJvbWlzZSA9IERCSGVscGVyLm9wZW5EQigpO1xyXG5cclxuICAgIHJldHVybiBkYlByb21pc2UudGhlbihkYiA9PiB7XHJcbiAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oJ3Jldmlld3MnLCAncmVhZHdyaXRlJyk7XHJcbiAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoJ3Jldmlld3MnKTtcclxuICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHJldmlld3MubWFwKHJldmlldyA9PiBzdG9yZS5wdXQocmV2aWV3KSkpXHJcbiAgICAgICAgLmNhdGNoKChlcnIpID0+IHtcclxuICAgICAgICAgIHRocm93IEVycm9yKCdSZXZpZXdzIHdlcmUgbm90IGFkZGVkIHRvIHRoZSBzdG9yZTogJyArIGVycik7XHJcbiAgICAgICAgfSlcclxuICAgIH0pO1xyXG4gICB9XHJcblxyXG4gICAvKipcclxuICAgKiAgR2V0IHJldmlld3MgZnJvbSBsb2NhbCBkYXRhYmFzZVxyXG4gICAqL1xyXG4gICBzdGF0aWMgZ2V0TG9jYWxSZXZpZXdzKCkge1xyXG4gICAgaWYgKCEoJ2luZGV4ZWREQicgaW4gd2luZG93KSkge3JldHVybiBudWxsO31cclxuICAgIHJldHVybiBEQkhlbHBlci5vcGVuREIoKS50aGVuKGRiID0+IHtcclxuICAgICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbigncmV2aWV3cycsICdyZWFkb25seScpO1xyXG4gICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKCdyZXZpZXdzJyk7XHJcbiAgICAgIHJldHVybiBzdG9yZS5nZXRBbGwoKTtcclxuICAgIH0pO1xyXG4gICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlc3RhdXJhbnQgcGFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIHVybEZvclJlc3RhdXJhbnQocmVzdGF1cmFudCkge1xyXG4gICAgcmV0dXJuIChgLi9yZXN0YXVyYW50Lmh0bWw/aWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCBpbWFnZSBVUkwuXHJcbiAgICovXHJcbiAgc3RhdGljIGltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAvaW1nLyR7cmVzdGF1cmFudC5waG90b2dyYXBofWApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzdGF1cmFudCByZXZpZXdzIFVSTFxyXG4gICAqL1xyXG4gICBzdGF0aWMgdXJsRm9yUmV2aWV3cyhyZXN0YXVyYW50KSB7XHJcbiAgICByZXR1cm4gKGAuL3Jldmlld3MvP3Jlc3RhdXJhbnRfaWQ9JHtyZXN0YXVyYW50LmlkfWApO1xyXG4gICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcCBtYXJrZXIgZm9yIGEgcmVzdGF1cmFudC5cclxuICAgKi9cclxuICBzdGF0aWMgbWFwTWFya2VyRm9yUmVzdGF1cmFudChyZXN0YXVyYW50LCBtYXApIHtcclxuICAgIGNvbnN0IG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICBwb3NpdGlvbjogcmVzdGF1cmFudC5sYXRsbmcsXHJcbiAgICAgIHRpdGxlOiByZXN0YXVyYW50Lm5hbWUsXHJcbiAgICAgIHVybDogREJIZWxwZXIudXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KSxcclxuICAgICAgbWFwOiBtYXAsXHJcbiAgICAgIGFuaW1hdGlvbjogZ29vZ2xlLm1hcHMuQW5pbWF0aW9uLkRST1B9XHJcbiAgICApO1xyXG4gICAgcmV0dXJuIG1hcmtlcjtcclxuICB9XHJcblxyXG59XHJcbiJdLCJmaWxlIjoiZGJoZWxwZXIuanMifQ==
