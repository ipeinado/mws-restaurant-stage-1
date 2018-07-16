let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  setFavButton(restaurant);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-img');
  const image_name = DBHelper.imageUrlForRestaurant(restaurant);
  const alt_text = 'Image of ' + restaurant.name + ' Restaurant';
  const sizes = '(max-width: 640px) 100vw, 50vw';

  const srcset_jpg = image_name + '-medium.jpg 570w, ' + image_name + '.jpg 800w';
  const srcset_webp = image_name + '-medium.webp 570w, ' + image_name + '.webp 800w';

  const source = document.createElement('source');
  source.setAttribute('type', 'image/webp');
  source.setAttribute('srcset', srcset_webp);
  source.setAttribute('sizes', sizes);
  source.setAttribute('alt', alt_text);

  picture.appendChild(source);

  const img_srcset = document.createElement('source');
  img_srcset.setAttribute('type', 'image/jpeg');
  img_srcset.setAttribute('srcset', srcset_jpg);
  img_srcset.setAttribute('sizes', sizes);
  img_srcset.setAttribute('alt', alt_text);

  picture.appendChild(img_srcset);

  const img = document.createElement('img');
  img.setAttribute('src', image_name + '.jpg');
  img.setAttribute('alt', alt_text);

  picture.appendChild(img);


  // image.className = 'restaurant-img';
  // const image_name = DBHelper.imageUrlForRestaurant(restaurant);
  // image.src = image_name + "-small@2x.jpg";
  // image.setAttribute('srcset', image_name + ' 2x');
  // image.setAttribute('alt', 'Image of ' + restaurant.name + ' Restaurant');

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();

  // create review form
  createReviewForm();
}

/**
 * Set favorite button
 */
setFavButton = (restaurant = self.restaurant) => {
  const favButton = document.getElementById("favButton");
  if (restaurant.is_favorite) {
    favButton.innerHTML = "&#10084; Remove from favorites";
    favButton.setAttribute('class', 'fav-button favorite');
  } else {
    favButton.innerHTML = "<span class='heart'>&#10084;</span> Add to favorites";
    favButton.setAttribute('class', 'fav-button non-favorite');
  }
  favButton.addEventListener('click', favButtonClick);
}

/**
 *  Click favorite button
 */
 favButtonClick = (event, restaurant = self.restaurant) => {
  event.preventDefault();
  restaurant.is_favorite = !restaurant.is_favorite;
  setFavButton(restaurant);
  
  // Update record in local database
  DBHelper.saveRestaurantsLocally([restaurant])
    .catch(err => console.log(err));
  
  // Update record in server
  const headers = new Headers({'Content-Type': 'application/json'});
  fetch(`http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`,
    {method: 'put', headers: headers})
    .catch(err => console.log(err));
 } 



/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (restaurant = self.restaurant) => {
  const container = document.getElementById('reviews-container'),
        ul = document.getElementById('reviews-list');
  
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';

  container.insertBefore(title, ul);

  DBHelper.fetchReviewsByRestaurant(restaurant.id, (error, reviews) => {
    if (error) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'Sorry, there was a problem downloading the reviews';
      container.appendChild(noReviews);
      return;
    }

    // If there are any reviews
    if (reviews.length > 0) {
      updateReviewsUI(reviews);
    }
  });
}

/**
* Update reviews in the restaurants page
*/
updateReviewsUI = (reviews) => {
  const ul = document.getElementById('reviews-list');
  
  reviews.forEach(review => {
    const item = createReviewHTML(review);
    ul.appendChild(item);
  });
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  const header = document.createElement('div');
  const content = document.createElement('div');

  header.className = 'header';
  content.className = 'review-content';
  li.appendChild(header);
  li.appendChild(content);

  name.className = 'reviewer-name';
  name.innerHTML = review.name;
  header.appendChild(name);

  const date = document.createElement('p');
  date.className = 'review-date';
  date.innerHTML = new Date(review.updatedAt).toLocaleDateString("en-US");
  header.appendChild(date);

  const rating = document.createElement('p');
  rating.className = 'review-rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  content.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  content.appendChild(comments);

  return li;
}

/**
* create reviewForm
*/
createReviewForm = (restaurant = self.restaurant) => {
  const formContainer = document.getElementById('reviews-form');

  const title = document.createElement('h4');
  title.innerHTML = "Add your review";

  formContainer.appendChild(title);

  const form = document.createElement('form');
  form.setAttribute('method', 'http://localhost:1337/reviews/');
  form.setAttribute('action', 'post');

  const hiddenId = document.createElement('input');
  hiddenId.setAttribute('id', 'restaurant_id');
  hiddenId.setAttribute('name', 'restaurant_id');
  hiddenId.setAttribute('type', 'hidden');
  hiddenId.setAttribute('value', restaurant.id);

  form.appendChild(hiddenId);

  const divName = document.createElement('div');

  const labelName = document.createElement('label');
  labelName.setAttribute('for', 'name');
  labelName.innerHTML = 'Your Name';
  divName.appendChild(labelName);

  const inputName = document.createElement('input');
  inputName.setAttribute('type', 'text');
  inputName.setAttribute('id', 'name');
  inputName.setAttribute('name', 'name');
  inputName.setAttribute('required', '');
  divName.appendChild(inputName);

  form.appendChild(divName);

  const divRating = document.createElement('div');

  const labelRating = document.createElement('label');
  labelRating.setAttribute('for', 'rating');
  labelRating.innerHTML = 'Rating';
  divRating.appendChild(labelRating);

  const inputRating = document.createElement('input');
  inputRating.setAttribute('type', 'number');
  inputRating.setAttribute('id', 'rating');
  inputRating.setAttribute('name', 'rating');
  inputRating.setAttribute('step', 1);
  inputRating.setAttribute('min', 1);
  inputRating.setAttribute('max', 5);
  divRating.appendChild(inputRating);

  form.appendChild(divRating);

  const divComments = document.createElement('div');

  const labelComments = document.createElement('label');
  labelComments.setAttribute('for', 'comments');
  labelComments.innerHTML = 'Your comments';
  divComments.appendChild(labelComments);

  const inputComments = document.createElement('textarea');
  inputComments.setAttribute('id', 'comments');
  inputComments.setAttribute('name', 'comments');

  divComments.appendChild(inputComments);
  form.appendChild(divComments);

  const divButton = document.createElement('div');

  const submitButton = document.createElement('button');
  submitButton.setAttribute('type', 'submit');
  submitButton.setAttribute('id', 'submit');
  submitButton.setAttribute('class', 'button');
  submitButton.setAttribute('role', 'button');
  submitButton.innerHTML = 'Submit your review';

  form.appendChild(submitButton);

  form.addEventListener('submit', addAndPostReview);

  formContainer.appendChild(form);
}

postReview = (review) => {
  delete review.is_pending;

  const headers = new Headers({'Accept': 'application/json', 'Content-Type': 'application/json; charset=utf-8'});
  const body = JSON.stringify(review);

  fetch('http://localhost:1337/reviews/', {
    method: 'post',
    mode: 'cors',
    headers: headers,
    body: body
  }).then(response => {
    // If the response is ok, remove the is_pending flag and update the record in the database
    if ((response.status == 200) || (response.status == 201)) {
      DBHelper.openDB().then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        const store = tx.objectStore('reviews');
        return store.put(review);
      })
    } else {
      throw new Error('response status is not 200 or 201')
    }
  }).catch(err => console.log('Could not post the review: ' + err));
}


addAndPostReview = (event) => {
  event.preventDefault();

  const url = new URL(window.location),
        restaurant_id_url = url.searchParams.get('id');

  const data = {
    restaurant_id: parseInt(restaurant_id_url, 10),
    name: document.getElementById('name').value,
    rating: parseInt(document.getElementById('rating').value, 10),
    comments: document.getElementById('comments').value,
    is_pending: true
  }

  document.getElementById('name').value = '';
  document.getElementById('rating').value = '';
  document.getElementById('comments').value = '';

  // append the review to the list
  updateReviewsUI([data]);

  // save the review in the local database
  DBHelper.saveReviewsLocally([data])
    .then(response => console.log('Review saved locally'))
    .catch(err => console.log('Could not save reviews locally' + err));

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    console.log('service worker in navigator etc.');
    navigator.serviceWorker.ready
      .then(reg => {
        reg.sync.register('submitReviews');
      })
      .catch(err => {
        // system was unable to register for a sync, send normal
        postReview(data);
      });
  } else {
    // if there is no service worker
    postReview(data);
  }
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.setAttribute('aria-current', 'page');
  li.appendChild(span);
  span.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJyZXN0YXVyYW50X2luZm8uanMiXSwic291cmNlc0NvbnRlbnQiOlsibGV0IHJlc3RhdXJhbnQ7XG52YXIgbWFwO1xuXG4vKipcbiAqIEluaXRpYWxpemUgR29vZ2xlIG1hcCwgY2FsbGVkIGZyb20gSFRNTC5cbiAqL1xud2luZG93LmluaXRNYXAgPSAoKSA9PiB7XG4gIGZldGNoUmVzdGF1cmFudEZyb21VUkwoKGVycm9yLCByZXN0YXVyYW50KSA9PiB7XG4gICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvciFcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XG4gICAgICAgIHpvb206IDE2LFxuICAgICAgICBjZW50ZXI6IHJlc3RhdXJhbnQubGF0bG5nLFxuICAgICAgICBzY3JvbGx3aGVlbDogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgZmlsbEJyZWFkY3J1bWIoKTtcbiAgICAgIERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQoc2VsZi5yZXN0YXVyYW50LCBzZWxmLm1hcCk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBHZXQgY3VycmVudCByZXN0YXVyYW50IGZyb20gcGFnZSBVUkwuXG4gKi9cbmZldGNoUmVzdGF1cmFudEZyb21VUkwgPSAoY2FsbGJhY2spID0+IHtcbiAgaWYgKHNlbGYucmVzdGF1cmFudCkgeyAvLyByZXN0YXVyYW50IGFscmVhZHkgZmV0Y2hlZCFcbiAgICBjYWxsYmFjayhudWxsLCBzZWxmLnJlc3RhdXJhbnQpXG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGlkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCdpZCcpO1xuICBpZiAoIWlkKSB7IC8vIG5vIGlkIGZvdW5kIGluIFVSTFxuICAgIGVycm9yID0gJ05vIHJlc3RhdXJhbnQgaWQgaW4gVVJMJ1xuICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgfSBlbHNlIHtcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCAoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcbiAgICAgIHNlbGYucmVzdGF1cmFudCA9IHJlc3RhdXJhbnQ7XG4gICAgICBpZiAoIXJlc3RhdXJhbnQpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZpbGxSZXN0YXVyYW50SFRNTCgpO1xuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudClcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSByZXN0YXVyYW50IEhUTUwgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZVxuICovXG5maWxsUmVzdGF1cmFudEhUTUwgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtbmFtZScpO1xuICBuYW1lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcblxuICBzZXRGYXZCdXR0b24ocmVzdGF1cmFudCk7XG5cbiAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWFkZHJlc3MnKTtcbiAgYWRkcmVzcy5pbm5lckhUTUwgPSByZXN0YXVyYW50LmFkZHJlc3M7XG5cbiAgY29uc3QgcGljdHVyZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWltZycpO1xuICBjb25zdCBpbWFnZV9uYW1lID0gREJIZWxwZXIuaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xuICBjb25zdCBhbHRfdGV4dCA9ICdJbWFnZSBvZiAnICsgcmVzdGF1cmFudC5uYW1lICsgJyBSZXN0YXVyYW50JztcbiAgY29uc3Qgc2l6ZXMgPSAnKG1heC13aWR0aDogNjQwcHgpIDEwMHZ3LCA1MHZ3JztcblxuICBjb25zdCBzcmNzZXRfanBnID0gaW1hZ2VfbmFtZSArICctbWVkaXVtLmpwZyA1NzB3LCAnICsgaW1hZ2VfbmFtZSArICcuanBnIDgwMHcnO1xuICBjb25zdCBzcmNzZXRfd2VicCA9IGltYWdlX25hbWUgKyAnLW1lZGl1bS53ZWJwIDU3MHcsICcgKyBpbWFnZV9uYW1lICsgJy53ZWJwIDgwMHcnO1xuXG4gIGNvbnN0IHNvdXJjZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NvdXJjZScpO1xuICBzb3VyY2Uuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2ltYWdlL3dlYnAnKTtcbiAgc291cmNlLnNldEF0dHJpYnV0ZSgnc3Jjc2V0Jywgc3Jjc2V0X3dlYnApO1xuICBzb3VyY2Uuc2V0QXR0cmlidXRlKCdzaXplcycsIHNpemVzKTtcbiAgc291cmNlLnNldEF0dHJpYnV0ZSgnYWx0JywgYWx0X3RleHQpO1xuXG4gIHBpY3R1cmUuYXBwZW5kQ2hpbGQoc291cmNlKTtcblxuICBjb25zdCBpbWdfc3Jjc2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc291cmNlJyk7XG4gIGltZ19zcmNzZXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2ltYWdlL2pwZWcnKTtcbiAgaW1nX3NyY3NldC5zZXRBdHRyaWJ1dGUoJ3NyY3NldCcsIHNyY3NldF9qcGcpO1xuICBpbWdfc3Jjc2V0LnNldEF0dHJpYnV0ZSgnc2l6ZXMnLCBzaXplcyk7XG4gIGltZ19zcmNzZXQuc2V0QXR0cmlidXRlKCdhbHQnLCBhbHRfdGV4dCk7XG5cbiAgcGljdHVyZS5hcHBlbmRDaGlsZChpbWdfc3Jjc2V0KTtcblxuICBjb25zdCBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgaW1nLnNldEF0dHJpYnV0ZSgnc3JjJywgaW1hZ2VfbmFtZSArICcuanBnJyk7XG4gIGltZy5zZXRBdHRyaWJ1dGUoJ2FsdCcsIGFsdF90ZXh0KTtcblxuICBwaWN0dXJlLmFwcGVuZENoaWxkKGltZyk7XG5cblxuICAvLyBpbWFnZS5jbGFzc05hbWUgPSAncmVzdGF1cmFudC1pbWcnO1xuICAvLyBjb25zdCBpbWFnZV9uYW1lID0gREJIZWxwZXIuaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xuICAvLyBpbWFnZS5zcmMgPSBpbWFnZV9uYW1lICsgXCItc21hbGxAMnguanBnXCI7XG4gIC8vIGltYWdlLnNldEF0dHJpYnV0ZSgnc3Jjc2V0JywgaW1hZ2VfbmFtZSArICcgMngnKTtcbiAgLy8gaW1hZ2Uuc2V0QXR0cmlidXRlKCdhbHQnLCAnSW1hZ2Ugb2YgJyArIHJlc3RhdXJhbnQubmFtZSArICcgUmVzdGF1cmFudCcpO1xuXG4gIGNvbnN0IGN1aXNpbmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1jdWlzaW5lJyk7XG4gIGN1aXNpbmUuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5jdWlzaW5lX3R5cGU7XG5cbiAgLy8gZmlsbCBvcGVyYXRpbmcgaG91cnNcbiAgaWYgKHJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzKSB7XG4gICAgZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwoKTtcbiAgfVxuICAvLyBmaWxsIHJldmlld3NcbiAgZmlsbFJldmlld3NIVE1MKCk7XG5cbiAgLy8gY3JlYXRlIHJldmlldyBmb3JtXG4gIGNyZWF0ZVJldmlld0Zvcm0oKTtcbn1cblxuLyoqXG4gKiBTZXQgZmF2b3JpdGUgYnV0dG9uXG4gKi9cbnNldEZhdkJ1dHRvbiA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XG4gIGNvbnN0IGZhdkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZmF2QnV0dG9uXCIpO1xuICBpZiAocmVzdGF1cmFudC5pc19mYXZvcml0ZSkge1xuICAgIGZhdkJ1dHRvbi5pbm5lckhUTUwgPSBcIiYjMTAwODQ7IFJlbW92ZSBmcm9tIGZhdm9yaXRlc1wiO1xuICAgIGZhdkJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2Zhdi1idXR0b24gZmF2b3JpdGUnKTtcbiAgfSBlbHNlIHtcbiAgICBmYXZCdXR0b24uaW5uZXJIVE1MID0gXCI8c3BhbiBjbGFzcz0naGVhcnQnPiYjMTAwODQ7PC9zcGFuPiBBZGQgdG8gZmF2b3JpdGVzXCI7XG4gICAgZmF2QnV0dG9uLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnZmF2LWJ1dHRvbiBub24tZmF2b3JpdGUnKTtcbiAgfVxuICBmYXZCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmYXZCdXR0b25DbGljayk7XG59XG5cbi8qKlxuICogIENsaWNrIGZhdm9yaXRlIGJ1dHRvblxuICovXG4gZmF2QnV0dG9uQ2xpY2sgPSAoZXZlbnQsIHJlc3RhdXJhbnQgPSBzZWxmLnJlc3RhdXJhbnQpID0+IHtcbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgcmVzdGF1cmFudC5pc19mYXZvcml0ZSA9ICFyZXN0YXVyYW50LmlzX2Zhdm9yaXRlO1xuICBzZXRGYXZCdXR0b24ocmVzdGF1cmFudCk7XG4gIFxuICAvLyBVcGRhdGUgcmVjb3JkIGluIGxvY2FsIGRhdGFiYXNlXG4gIERCSGVscGVyLnNhdmVSZXN0YXVyYW50c0xvY2FsbHkoW3Jlc3RhdXJhbnRdKVxuICAgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG4gIFxuICAvLyBVcGRhdGUgcmVjb3JkIGluIHNlcnZlclxuICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoeydDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbid9KTtcbiAgZmV0Y2goYGh0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXN0YXVyYW50cy8ke3Jlc3RhdXJhbnQuaWR9Lz9pc19mYXZvcml0ZT0ke3Jlc3RhdXJhbnQuaXNfZmF2b3JpdGV9YCxcbiAgICB7bWV0aG9kOiAncHV0JywgaGVhZGVyczogaGVhZGVyc30pXG4gICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyhlcnIpKTtcbiB9IFxuXG5cblxuLyoqXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBvcGVyYXRpbmcgaG91cnMgSFRNTCB0YWJsZSBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlLlxuICovXG5maWxsUmVzdGF1cmFudEhvdXJzSFRNTCA9IChvcGVyYXRpbmdIb3VycyA9IHNlbGYucmVzdGF1cmFudC5vcGVyYXRpbmdfaG91cnMpID0+IHtcbiAgY29uc3QgaG91cnMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1ob3VycycpO1xuICBmb3IgKGxldCBrZXkgaW4gb3BlcmF0aW5nSG91cnMpIHtcbiAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuXG4gICAgY29uc3QgZGF5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKTtcbiAgICBkYXkuaW5uZXJIVE1MID0ga2V5O1xuICAgIHJvdy5hcHBlbmRDaGlsZChkYXkpO1xuXG4gICAgY29uc3QgdGltZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XG4gICAgdGltZS5pbm5lckhUTUwgPSBvcGVyYXRpbmdIb3Vyc1trZXldO1xuICAgIHJvdy5hcHBlbmRDaGlsZCh0aW1lKTtcblxuICAgIGhvdXJzLmFwcGVuZENoaWxkKHJvdyk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYWxsIHJldmlld3MgSFRNTCBhbmQgYWRkIHRoZW0gdG8gdGhlIHdlYnBhZ2UuXG4gKi9cbmZpbGxSZXZpZXdzSFRNTCA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XG4gIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWNvbnRhaW5lcicpLFxuICAgICAgICB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWxpc3QnKTtcbiAgXG4gIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDMnKTtcbiAgdGl0bGUuaW5uZXJIVE1MID0gJ1Jldmlld3MnO1xuXG4gIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUodGl0bGUsIHVsKTtcblxuICBEQkhlbHBlci5mZXRjaFJldmlld3NCeVJlc3RhdXJhbnQocmVzdGF1cmFudC5pZCwgKGVycm9yLCByZXZpZXdzKSA9PiB7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zdCBub1Jldmlld3MgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gICAgICBub1Jldmlld3MuaW5uZXJIVE1MID0gJ1NvcnJ5LCB0aGVyZSB3YXMgYSBwcm9ibGVtIGRvd25sb2FkaW5nIHRoZSByZXZpZXdzJztcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChub1Jldmlld3MpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgcmV2aWV3c1xuICAgIGlmIChyZXZpZXdzLmxlbmd0aCA+IDApIHtcbiAgICAgIHVwZGF0ZVJldmlld3NVSShyZXZpZXdzKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiogVXBkYXRlIHJldmlld3MgaW4gdGhlIHJlc3RhdXJhbnRzIHBhZ2VcbiovXG51cGRhdGVSZXZpZXdzVUkgPSAocmV2aWV3cykgPT4ge1xuICBjb25zdCB1bCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWxpc3QnKTtcbiAgXG4gIHJldmlld3MuZm9yRWFjaChyZXZpZXcgPT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBjcmVhdGVSZXZpZXdIVE1MKHJldmlldyk7XG4gICAgdWwuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIENyZWF0ZSByZXZpZXcgSFRNTCBhbmQgYWRkIGl0IHRvIHRoZSB3ZWJwYWdlLlxuICovXG5jcmVhdGVSZXZpZXdIVE1MID0gKHJldmlldykgPT4ge1xuICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gIGNvbnN0IG5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBjb25zdCBjb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgaGVhZGVyLmNsYXNzTmFtZSA9ICdoZWFkZXInO1xuICBjb250ZW50LmNsYXNzTmFtZSA9ICdyZXZpZXctY29udGVudCc7XG4gIGxpLmFwcGVuZENoaWxkKGhlYWRlcik7XG4gIGxpLmFwcGVuZENoaWxkKGNvbnRlbnQpO1xuXG4gIG5hbWUuY2xhc3NOYW1lID0gJ3Jldmlld2VyLW5hbWUnO1xuICBuYW1lLmlubmVySFRNTCA9IHJldmlldy5uYW1lO1xuICBoZWFkZXIuYXBwZW5kQ2hpbGQobmFtZSk7XG5cbiAgY29uc3QgZGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgZGF0ZS5jbGFzc05hbWUgPSAncmV2aWV3LWRhdGUnO1xuICBkYXRlLmlubmVySFRNTCA9IG5ldyBEYXRlKHJldmlldy51cGRhdGVkQXQpLnRvTG9jYWxlRGF0ZVN0cmluZyhcImVuLVVTXCIpO1xuICBoZWFkZXIuYXBwZW5kQ2hpbGQoZGF0ZSk7XG5cbiAgY29uc3QgcmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICByYXRpbmcuY2xhc3NOYW1lID0gJ3Jldmlldy1yYXRpbmcnO1xuICByYXRpbmcuaW5uZXJIVE1MID0gYFJhdGluZzogJHtyZXZpZXcucmF0aW5nfWA7XG4gIGNvbnRlbnQuYXBwZW5kQ2hpbGQocmF0aW5nKTtcblxuICBjb25zdCBjb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgY29tbWVudHMuaW5uZXJIVE1MID0gcmV2aWV3LmNvbW1lbnRzO1xuICBjb250ZW50LmFwcGVuZENoaWxkKGNvbW1lbnRzKTtcblxuICByZXR1cm4gbGk7XG59XG5cbi8qKlxuKiBjcmVhdGUgcmV2aWV3Rm9ybVxuKi9cbmNyZWF0ZVJldmlld0Zvcm0gPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBmb3JtQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtZm9ybScpO1xuXG4gIGNvbnN0IHRpdGxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDQnKTtcbiAgdGl0bGUuaW5uZXJIVE1MID0gXCJBZGQgeW91ciByZXZpZXdcIjtcblxuICBmb3JtQ29udGFpbmVyLmFwcGVuZENoaWxkKHRpdGxlKTtcblxuICBjb25zdCBmb3JtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZm9ybScpO1xuICBmb3JtLnNldEF0dHJpYnV0ZSgnbWV0aG9kJywgJ2h0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXZpZXdzLycpO1xuICBmb3JtLnNldEF0dHJpYnV0ZSgnYWN0aW9uJywgJ3Bvc3QnKTtcblxuICBjb25zdCBoaWRkZW5JZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGhpZGRlbklkLnNldEF0dHJpYnV0ZSgnaWQnLCAncmVzdGF1cmFudF9pZCcpO1xuICBoaWRkZW5JZC5zZXRBdHRyaWJ1dGUoJ25hbWUnLCAncmVzdGF1cmFudF9pZCcpO1xuICBoaWRkZW5JZC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAnaGlkZGVuJyk7XG4gIGhpZGRlbklkLnNldEF0dHJpYnV0ZSgndmFsdWUnLCByZXN0YXVyYW50LmlkKTtcblxuICBmb3JtLmFwcGVuZENoaWxkKGhpZGRlbklkKTtcblxuICBjb25zdCBkaXZOYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgY29uc3QgbGFiZWxOYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcbiAgbGFiZWxOYW1lLnNldEF0dHJpYnV0ZSgnZm9yJywgJ25hbWUnKTtcbiAgbGFiZWxOYW1lLmlubmVySFRNTCA9ICdZb3VyIE5hbWUnO1xuICBkaXZOYW1lLmFwcGVuZENoaWxkKGxhYmVsTmFtZSk7XG5cbiAgY29uc3QgaW5wdXROYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgaW5wdXROYW1lLnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0Jyk7XG4gIGlucHV0TmFtZS5zZXRBdHRyaWJ1dGUoJ2lkJywgJ25hbWUnKTtcbiAgaW5wdXROYW1lLnNldEF0dHJpYnV0ZSgnbmFtZScsICduYW1lJyk7XG4gIGlucHV0TmFtZS5zZXRBdHRyaWJ1dGUoJ3JlcXVpcmVkJywgJycpO1xuICBkaXZOYW1lLmFwcGVuZENoaWxkKGlucHV0TmFtZSk7XG5cbiAgZm9ybS5hcHBlbmRDaGlsZChkaXZOYW1lKTtcblxuICBjb25zdCBkaXZSYXRpbmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBjb25zdCBsYWJlbFJhdGluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG4gIGxhYmVsUmF0aW5nLnNldEF0dHJpYnV0ZSgnZm9yJywgJ3JhdGluZycpO1xuICBsYWJlbFJhdGluZy5pbm5lckhUTUwgPSAnUmF0aW5nJztcbiAgZGl2UmF0aW5nLmFwcGVuZENoaWxkKGxhYmVsUmF0aW5nKTtcblxuICBjb25zdCBpbnB1dFJhdGluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGlucHV0UmF0aW5nLnNldEF0dHJpYnV0ZSgndHlwZScsICdudW1iZXInKTtcbiAgaW5wdXRSYXRpbmcuc2V0QXR0cmlidXRlKCdpZCcsICdyYXRpbmcnKTtcbiAgaW5wdXRSYXRpbmcuc2V0QXR0cmlidXRlKCduYW1lJywgJ3JhdGluZycpO1xuICBpbnB1dFJhdGluZy5zZXRBdHRyaWJ1dGUoJ3N0ZXAnLCAxKTtcbiAgaW5wdXRSYXRpbmcuc2V0QXR0cmlidXRlKCdtaW4nLCAxKTtcbiAgaW5wdXRSYXRpbmcuc2V0QXR0cmlidXRlKCdtYXgnLCA1KTtcbiAgZGl2UmF0aW5nLmFwcGVuZENoaWxkKGlucHV0UmF0aW5nKTtcblxuICBmb3JtLmFwcGVuZENoaWxkKGRpdlJhdGluZyk7XG5cbiAgY29uc3QgZGl2Q29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBjb25zdCBsYWJlbENvbW1lbnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcbiAgbGFiZWxDb21tZW50cy5zZXRBdHRyaWJ1dGUoJ2ZvcicsICdjb21tZW50cycpO1xuICBsYWJlbENvbW1lbnRzLmlubmVySFRNTCA9ICdZb3VyIGNvbW1lbnRzJztcbiAgZGl2Q29tbWVudHMuYXBwZW5kQ2hpbGQobGFiZWxDb21tZW50cyk7XG5cbiAgY29uc3QgaW5wdXRDb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJyk7XG4gIGlucHV0Q29tbWVudHMuc2V0QXR0cmlidXRlKCdpZCcsICdjb21tZW50cycpO1xuICBpbnB1dENvbW1lbnRzLnNldEF0dHJpYnV0ZSgnbmFtZScsICdjb21tZW50cycpO1xuXG4gIGRpdkNvbW1lbnRzLmFwcGVuZENoaWxkKGlucHV0Q29tbWVudHMpO1xuICBmb3JtLmFwcGVuZENoaWxkKGRpdkNvbW1lbnRzKTtcblxuICBjb25zdCBkaXZCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBjb25zdCBzdWJtaXRCdXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcbiAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgndHlwZScsICdzdWJtaXQnKTtcbiAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgnaWQnLCAnc3VibWl0Jyk7XG4gIHN1Ym1pdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2J1dHRvbicpO1xuICBzdWJtaXRCdXR0b24uc2V0QXR0cmlidXRlKCdyb2xlJywgJ2J1dHRvbicpO1xuICBzdWJtaXRCdXR0b24uaW5uZXJIVE1MID0gJ1N1Ym1pdCB5b3VyIHJldmlldyc7XG5cbiAgZm9ybS5hcHBlbmRDaGlsZChzdWJtaXRCdXR0b24pO1xuXG4gIGZvcm0uYWRkRXZlbnRMaXN0ZW5lcignc3VibWl0JywgYWRkQW5kUG9zdFJldmlldyk7XG5cbiAgZm9ybUNvbnRhaW5lci5hcHBlbmRDaGlsZChmb3JtKTtcbn1cblxucG9zdFJldmlldyA9IChyZXZpZXcpID0+IHtcbiAgZGVsZXRlIHJldmlldy5pc19wZW5kaW5nO1xuXG4gIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyh7J0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJywgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04J30pO1xuICBjb25zdCBib2R5ID0gSlNPTi5zdHJpbmdpZnkocmV2aWV3KTtcblxuICBmZXRjaCgnaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jldmlld3MvJywge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIG1vZGU6ICdjb3JzJyxcbiAgICBoZWFkZXJzOiBoZWFkZXJzLFxuICAgIGJvZHk6IGJvZHlcbiAgfSkudGhlbihyZXNwb25zZSA9PiB7XG4gICAgLy8gSWYgdGhlIHJlc3BvbnNlIGlzIG9rLCByZW1vdmUgdGhlIGlzX3BlbmRpbmcgZmxhZyBhbmQgdXBkYXRlIHRoZSByZWNvcmQgaW4gdGhlIGRhdGFiYXNlXG4gICAgaWYgKChyZXNwb25zZS5zdGF0dXMgPT0gMjAwKSB8fCAocmVzcG9uc2Uuc3RhdHVzID09IDIwMSkpIHtcbiAgICAgIERCSGVscGVyLm9wZW5EQigpLnRoZW4oZGIgPT4ge1xuICAgICAgICBjb25zdCB0eCA9IGRiLnRyYW5zYWN0aW9uKCdyZXZpZXdzJywgJ3JlYWR3cml0ZScpO1xuICAgICAgICBjb25zdCBzdG9yZSA9IHR4Lm9iamVjdFN0b3JlKCdyZXZpZXdzJyk7XG4gICAgICAgIHJldHVybiBzdG9yZS5wdXQocmV2aWV3KTtcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncmVzcG9uc2Ugc3RhdHVzIGlzIG5vdCAyMDAgb3IgMjAxJylcbiAgICB9XG4gIH0pLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZygnQ291bGQgbm90IHBvc3QgdGhlIHJldmlldzogJyArIGVycikpO1xufVxuXG5cbmFkZEFuZFBvc3RSZXZpZXcgPSAoZXZlbnQpID0+IHtcbiAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICBjb25zdCB1cmwgPSBuZXcgVVJMKHdpbmRvdy5sb2NhdGlvbiksXG4gICAgICAgIHJlc3RhdXJhbnRfaWRfdXJsID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2lkJyk7XG5cbiAgY29uc3QgZGF0YSA9IHtcbiAgICByZXN0YXVyYW50X2lkOiBwYXJzZUludChyZXN0YXVyYW50X2lkX3VybCwgMTApLFxuICAgIG5hbWU6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduYW1lJykudmFsdWUsXG4gICAgcmF0aW5nOiBwYXJzZUludChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmF0aW5nJykudmFsdWUsIDEwKSxcbiAgICBjb21tZW50czogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbW1lbnRzJykudmFsdWUsXG4gICAgaXNfcGVuZGluZzogdHJ1ZVxuICB9XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25hbWUnKS52YWx1ZSA9ICcnO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmF0aW5nJykudmFsdWUgPSAnJztcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbW1lbnRzJykudmFsdWUgPSAnJztcblxuICAvLyBhcHBlbmQgdGhlIHJldmlldyB0byB0aGUgbGlzdFxuICB1cGRhdGVSZXZpZXdzVUkoW2RhdGFdKTtcblxuICAvLyBzYXZlIHRoZSByZXZpZXcgaW4gdGhlIGxvY2FsIGRhdGFiYXNlXG4gIERCSGVscGVyLnNhdmVSZXZpZXdzTG9jYWxseShbZGF0YV0pXG4gICAgLnRoZW4ocmVzcG9uc2UgPT4gY29uc29sZS5sb2coJ1JldmlldyBzYXZlZCBsb2NhbGx5JykpXG4gICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZygnQ291bGQgbm90IHNhdmUgcmV2aWV3cyBsb2NhbGx5JyArIGVycikpO1xuXG4gIGlmICgnc2VydmljZVdvcmtlcicgaW4gbmF2aWdhdG9yICYmICdTeW5jTWFuYWdlcicgaW4gd2luZG93KSB7XG4gICAgY29uc29sZS5sb2coJ3NlcnZpY2Ugd29ya2VyIGluIG5hdmlnYXRvciBldGMuJyk7XG4gICAgbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIucmVhZHlcbiAgICAgIC50aGVuKHJlZyA9PiB7XG4gICAgICAgIHJlZy5zeW5jLnJlZ2lzdGVyKCdzdWJtaXRSZXZpZXdzJyk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIHN5c3RlbSB3YXMgdW5hYmxlIHRvIHJlZ2lzdGVyIGZvciBhIHN5bmMsIHNlbmQgbm9ybWFsXG4gICAgICAgIHBvc3RSZXZpZXcoZGF0YSk7XG4gICAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBpZiB0aGVyZSBpcyBubyBzZXJ2aWNlIHdvcmtlclxuICAgIHBvc3RSZXZpZXcoZGF0YSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBZGQgcmVzdGF1cmFudCBuYW1lIHRvIHRoZSBicmVhZGNydW1iIG5hdmlnYXRpb24gbWVudVxuICovXG5maWxsQnJlYWRjcnVtYiA9IChyZXN0YXVyYW50PXNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBicmVhZGNydW1iID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2JyZWFkY3J1bWInKTtcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICBjb25zdCBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICBzcGFuLnNldEF0dHJpYnV0ZSgnYXJpYS1jdXJyZW50JywgJ3BhZ2UnKTtcbiAgbGkuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gIHNwYW4uaW5uZXJIVE1MID0gcmVzdGF1cmFudC5uYW1lO1xuICBicmVhZGNydW1iLmFwcGVuZENoaWxkKGxpKTtcbn1cblxuLyoqXG4gKiBHZXQgYSBwYXJhbWV0ZXIgYnkgbmFtZSBmcm9tIHBhZ2UgVVJMLlxuICovXG5nZXRQYXJhbWV0ZXJCeU5hbWUgPSAobmFtZSwgdXJsKSA9PiB7XG4gIGlmICghdXJsKVxuICAgIHVybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmO1xuICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXFxdXS9nLCAnXFxcXCQmJyk7XG4gIGNvbnN0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgWz8mXSR7bmFtZX0oPShbXiYjXSopfCZ8I3wkKWApLFxuICAgIHJlc3VsdHMgPSByZWdleC5leGVjKHVybCk7XG4gIGlmICghcmVzdWx0cylcbiAgICByZXR1cm4gbnVsbDtcbiAgaWYgKCFyZXN1bHRzWzJdKVxuICAgIHJldHVybiAnJztcbiAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzJdLnJlcGxhY2UoL1xcKy9nLCAnICcpKTtcbn1cbiJdLCJmaWxlIjoicmVzdGF1cmFudF9pbmZvLmpzIn0=
