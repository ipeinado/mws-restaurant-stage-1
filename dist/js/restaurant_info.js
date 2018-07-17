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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJyZXN0YXVyYW50X2luZm8uanMiXSwic291cmNlc0NvbnRlbnQiOlsibGV0IHJlc3RhdXJhbnQ7XG52YXIgbWFwO1xuXG4vKipcbiAqIEluaXRpYWxpemUgR29vZ2xlIG1hcCwgY2FsbGVkIGZyb20gSFRNTC5cbiAqL1xud2luZG93LmluaXRNYXAgPSAoKSA9PiB7XG4gIGZldGNoUmVzdGF1cmFudEZyb21VUkwoKGVycm9yLCByZXN0YXVyYW50KSA9PiB7XG4gICAgaWYgKGVycm9yKSB7IC8vIEdvdCBhbiBlcnJvciFcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpLCB7XG4gICAgICAgIHpvb206IDE2LFxuICAgICAgICBjZW50ZXI6IHJlc3RhdXJhbnQubGF0bG5nLFxuICAgICAgICBzY3JvbGx3aGVlbDogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgZmlsbEJyZWFkY3J1bWIoKTtcbiAgICAgIERCSGVscGVyLm1hcE1hcmtlckZvclJlc3RhdXJhbnQoc2VsZi5yZXN0YXVyYW50LCBzZWxmLm1hcCk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4gKiBHZXQgY3VycmVudCByZXN0YXVyYW50IGZyb20gcGFnZSBVUkwuXG4gKi9cbmZldGNoUmVzdGF1cmFudEZyb21VUkwgPSAoY2FsbGJhY2spID0+IHtcbiAgaWYgKHNlbGYucmVzdGF1cmFudCkgeyAvLyByZXN0YXVyYW50IGFscmVhZHkgZmV0Y2hlZCFcbiAgICBjYWxsYmFjayhudWxsLCBzZWxmLnJlc3RhdXJhbnQpXG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGlkID0gZ2V0UGFyYW1ldGVyQnlOYW1lKCdpZCcpO1xuICBpZiAoIWlkKSB7IC8vIG5vIGlkIGZvdW5kIGluIFVSTFxuICAgIGVycm9yID0gJ05vIHJlc3RhdXJhbnQgaWQgaW4gVVJMJ1xuICAgIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgfSBlbHNlIHtcbiAgICBEQkhlbHBlci5mZXRjaFJlc3RhdXJhbnRCeUlkKGlkLCAoZXJyb3IsIHJlc3RhdXJhbnQpID0+IHtcbiAgICAgIHNlbGYucmVzdGF1cmFudCA9IHJlc3RhdXJhbnQ7XG4gICAgICBpZiAoIXJlc3RhdXJhbnQpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZpbGxSZXN0YXVyYW50SFRNTCgpO1xuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzdGF1cmFudClcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSByZXN0YXVyYW50IEhUTUwgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZVxuICovXG5maWxsUmVzdGF1cmFudEhUTUwgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtbmFtZScpO1xuICBuYW1lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcblxuICBzZXRGYXZCdXR0b24ocmVzdGF1cmFudCk7XG5cbiAgY29uc3QgYWRkcmVzcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWFkZHJlc3MnKTtcbiAgYWRkcmVzcy5pbm5lckhUTUwgPSByZXN0YXVyYW50LmFkZHJlc3M7XG5cbiAgY29uc3QgcGljdHVyZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWltZycpO1xuICBjb25zdCBpbWFnZV9uYW1lID0gREJIZWxwZXIuaW1hZ2VVcmxGb3JSZXN0YXVyYW50KHJlc3RhdXJhbnQpO1xuICBjb25zdCBhbHRfdGV4dCA9ICdJbWFnZSBvZiAnICsgcmVzdGF1cmFudC5uYW1lICsgJyBSZXN0YXVyYW50JztcbiAgY29uc3Qgc2l6ZXMgPSAnKG1heC13aWR0aDogNjQwcHgpIDEwMHZ3LCA1MHZ3JztcblxuICBjb25zdCBzcmNzZXRfanBnID0gaW1hZ2VfbmFtZSArICctbWVkaXVtLmpwZyA1NzB3LCAnICsgaW1hZ2VfbmFtZSArICcuanBnIDgwMHcnO1xuICBjb25zdCBzcmNzZXRfd2VicCA9IGltYWdlX25hbWUgKyAnLW1lZGl1bS53ZWJwIDU3MHcsICcgKyBpbWFnZV9uYW1lICsgJy53ZWJwIDgwMHcnO1xuXG4gIGNvbnN0IHNvdXJjZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NvdXJjZScpO1xuICBzb3VyY2Uuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2ltYWdlL3dlYnAnKTtcbiAgc291cmNlLnNldEF0dHJpYnV0ZSgnc3Jjc2V0Jywgc3Jjc2V0X3dlYnApO1xuICBzb3VyY2Uuc2V0QXR0cmlidXRlKCdzaXplcycsIHNpemVzKTtcbiAgc291cmNlLnNldEF0dHJpYnV0ZSgnYWx0JywgYWx0X3RleHQpO1xuXG4gIHBpY3R1cmUuYXBwZW5kQ2hpbGQoc291cmNlKTtcblxuICBjb25zdCBpbWdfc3Jjc2V0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc291cmNlJyk7XG4gIGltZ19zcmNzZXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2ltYWdlL2pwZWcnKTtcbiAgaW1nX3NyY3NldC5zZXRBdHRyaWJ1dGUoJ3NyY3NldCcsIHNyY3NldF9qcGcpO1xuICBpbWdfc3Jjc2V0LnNldEF0dHJpYnV0ZSgnc2l6ZXMnLCBzaXplcyk7XG4gIGltZ19zcmNzZXQuc2V0QXR0cmlidXRlKCdhbHQnLCBhbHRfdGV4dCk7XG5cbiAgcGljdHVyZS5hcHBlbmRDaGlsZChpbWdfc3Jjc2V0KTtcblxuICBjb25zdCBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcbiAgaW1nLnNldEF0dHJpYnV0ZSgnc3JjJywgaW1hZ2VfbmFtZSArICcuanBnJyk7XG4gIGltZy5zZXRBdHRyaWJ1dGUoJ2FsdCcsIGFsdF90ZXh0KTtcblxuICBwaWN0dXJlLmFwcGVuZENoaWxkKGltZyk7XG5cbiAgY29uc3QgY3Vpc2luZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWN1aXNpbmUnKTtcbiAgY3Vpc2luZS5pbm5lckhUTUwgPSByZXN0YXVyYW50LmN1aXNpbmVfdHlwZTtcblxuICAvLyBmaWxsIG9wZXJhdGluZyBob3Vyc1xuICBpZiAocmVzdGF1cmFudC5vcGVyYXRpbmdfaG91cnMpIHtcbiAgICBmaWxsUmVzdGF1cmFudEhvdXJzSFRNTCgpO1xuICB9XG4gIC8vIGZpbGwgcmV2aWV3c1xuICBmaWxsUmV2aWV3c0hUTUwoKTtcblxuICAvLyBjcmVhdGUgcmV2aWV3IGZvcm1cbiAgY3JlYXRlUmV2aWV3Rm9ybSgpO1xufVxuXG4vKipcbiAqIFNldCBmYXZvcml0ZSBidXR0b25cbiAqL1xuc2V0RmF2QnV0dG9uID0gKHJlc3RhdXJhbnQgPSBzZWxmLnJlc3RhdXJhbnQpID0+IHtcbiAgY29uc3QgZmF2QnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmYXZCdXR0b25cIik7XG4gIGlmIChyZXN0YXVyYW50LmlzX2Zhdm9yaXRlKSB7XG4gICAgZmF2QnV0dG9uLmlubmVySFRNTCA9IFwiJiMxMDA4NDsgUmVtb3ZlIGZyb20gZmF2b3JpdGVzXCI7XG4gICAgZmF2QnV0dG9uLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnZmF2LWJ1dHRvbiBmYXZvcml0ZScpO1xuICB9IGVsc2Uge1xuICAgIGZhdkJ1dHRvbi5pbm5lckhUTUwgPSBcIjxzcGFuIGNsYXNzPSdoZWFydCc+JiMxMDA4NDs8L3NwYW4+IEFkZCB0byBmYXZvcml0ZXNcIjtcbiAgICBmYXZCdXR0b24uc2V0QXR0cmlidXRlKCdjbGFzcycsICdmYXYtYnV0dG9uIG5vbi1mYXZvcml0ZScpO1xuICB9XG4gIGZhdkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZhdkJ1dHRvbkNsaWNrKTtcbn1cblxuLyoqXG4gKiAgQ2xpY2sgZmF2b3JpdGUgYnV0dG9uXG4gKi9cbiBmYXZCdXR0b25DbGljayA9IChldmVudCwgcmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICByZXN0YXVyYW50LmlzX2Zhdm9yaXRlID0gIXJlc3RhdXJhbnQuaXNfZmF2b3JpdGU7XG4gIHNldEZhdkJ1dHRvbihyZXN0YXVyYW50KTtcbiAgXG4gIC8vIFVwZGF0ZSByZWNvcmQgaW4gbG9jYWwgZGF0YWJhc2VcbiAgREJIZWxwZXIuc2F2ZVJlc3RhdXJhbnRzTG9jYWxseShbcmVzdGF1cmFudF0pXG4gICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmxvZyhlcnIpKTtcbiAgXG4gIC8vIFVwZGF0ZSByZWNvcmQgaW4gc2VydmVyXG4gIGNvbnN0IGhlYWRlcnMgPSBuZXcgSGVhZGVycyh7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ30pO1xuICBmZXRjaChgaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jlc3RhdXJhbnRzLyR7cmVzdGF1cmFudC5pZH0vP2lzX2Zhdm9yaXRlPSR7cmVzdGF1cmFudC5pc19mYXZvcml0ZX1gLFxuICAgIHttZXRob2Q6ICdwdXQnLCBoZWFkZXJzOiBoZWFkZXJzfSlcbiAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xuIH0gXG5cblxuXG4vKipcbiAqIENyZWF0ZSByZXN0YXVyYW50IG9wZXJhdGluZyBob3VycyBIVE1MIHRhYmxlIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2UuXG4gKi9cbmZpbGxSZXN0YXVyYW50SG91cnNIVE1MID0gKG9wZXJhdGluZ0hvdXJzID0gc2VsZi5yZXN0YXVyYW50Lm9wZXJhdGluZ19ob3VycykgPT4ge1xuICBjb25zdCBob3VycyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LWhvdXJzJyk7XG4gIGZvciAobGV0IGtleSBpbiBvcGVyYXRpbmdIb3Vycykge1xuICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG5cbiAgICBjb25zdCBkYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgIGRheS5pbm5lckhUTUwgPSBrZXk7XG4gICAgcm93LmFwcGVuZENoaWxkKGRheSk7XG5cbiAgICBjb25zdCB0aW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGQnKTtcbiAgICB0aW1lLmlubmVySFRNTCA9IG9wZXJhdGluZ0hvdXJzW2tleV07XG4gICAgcm93LmFwcGVuZENoaWxkKHRpbWUpO1xuXG4gICAgaG91cnMuYXBwZW5kQ2hpbGQocm93KTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBhbGwgcmV2aWV3cyBIVE1MIGFuZCBhZGQgdGhlbSB0byB0aGUgd2VicGFnZS5cbiAqL1xuZmlsbFJldmlld3NIVE1MID0gKHJlc3RhdXJhbnQgPSBzZWxmLnJlc3RhdXJhbnQpID0+IHtcbiAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtY29udGFpbmVyJyksXG4gICAgICAgIHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtbGlzdCcpO1xuICBcbiAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMycpO1xuICB0aXRsZS5pbm5lckhUTUwgPSAnUmV2aWV3cyc7XG5cbiAgY29udGFpbmVyLmluc2VydEJlZm9yZSh0aXRsZSwgdWwpO1xuXG4gIERCSGVscGVyLmZldGNoUmV2aWV3c0J5UmVzdGF1cmFudChyZXN0YXVyYW50LmlkLCAoZXJyb3IsIHJldmlld3MpID0+IHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IG5vUmV2aWV3cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgICAgIG5vUmV2aWV3cy5pbm5lckhUTUwgPSAnU29ycnksIHRoZXJlIHdhcyBhIHByb2JsZW0gZG93bmxvYWRpbmcgdGhlIHJldmlld3MnO1xuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5vUmV2aWV3cyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSByZXZpZXdzXG4gICAgaWYgKHJldmlld3MubGVuZ3RoID4gMCkge1xuICAgICAgdXBkYXRlUmV2aWV3c1VJKHJldmlld3MpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuKiBVcGRhdGUgcmV2aWV3cyBpbiB0aGUgcmVzdGF1cmFudHMgcGFnZVxuKi9cbnVwZGF0ZVJldmlld3NVSSA9IChyZXZpZXdzKSA9PiB7XG4gIGNvbnN0IHVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jldmlld3MtbGlzdCcpO1xuICBcbiAgcmV2aWV3cy5mb3JFYWNoKHJldmlldyA9PiB7XG4gICAgY29uc3QgaXRlbSA9IGNyZWF0ZVJldmlld0hUTUwocmV2aWV3KTtcbiAgICB1bC5hcHBlbmRDaGlsZChpdGVtKTtcbiAgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIHJldmlldyBIVE1MIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2UuXG4gKi9cbmNyZWF0ZVJldmlld0hUTUwgPSAocmV2aWV3KSA9PiB7XG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgY29uc3QgaGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGNvbnN0IGNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBoZWFkZXIuY2xhc3NOYW1lID0gJ2hlYWRlcic7XG4gIGNvbnRlbnQuY2xhc3NOYW1lID0gJ3Jldmlldy1jb250ZW50JztcbiAgbGkuYXBwZW5kQ2hpbGQoaGVhZGVyKTtcbiAgbGkuYXBwZW5kQ2hpbGQoY29udGVudCk7XG5cbiAgbmFtZS5jbGFzc05hbWUgPSAncmV2aWV3ZXItbmFtZSc7XG4gIG5hbWUuaW5uZXJIVE1MID0gcmV2aWV3Lm5hbWU7XG4gIGhlYWRlci5hcHBlbmRDaGlsZChuYW1lKTtcblxuICBjb25zdCBkYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICBkYXRlLmNsYXNzTmFtZSA9ICdyZXZpZXctZGF0ZSc7XG4gIGRhdGUuaW5uZXJIVE1MID0gbmV3IERhdGUocmV2aWV3LnVwZGF0ZWRBdCkudG9Mb2NhbGVEYXRlU3RyaW5nKFwiZW4tVVNcIik7XG4gIGhlYWRlci5hcHBlbmRDaGlsZChkYXRlKTtcblxuICBjb25zdCByYXRpbmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gIHJhdGluZy5jbGFzc05hbWUgPSAncmV2aWV3LXJhdGluZyc7XG4gIHJhdGluZy5pbm5lckhUTUwgPSBgUmF0aW5nOiAke3Jldmlldy5yYXRpbmd9YDtcbiAgY29udGVudC5hcHBlbmRDaGlsZChyYXRpbmcpO1xuXG4gIGNvbnN0IGNvbW1lbnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICBjb21tZW50cy5pbm5lckhUTUwgPSByZXZpZXcuY29tbWVudHM7XG4gIGNvbnRlbnQuYXBwZW5kQ2hpbGQoY29tbWVudHMpO1xuXG4gIHJldHVybiBsaTtcbn1cblxuLyoqXG4qIGNyZWF0ZSByZXZpZXdGb3JtXG4qL1xuY3JlYXRlUmV2aWV3Rm9ybSA9IChyZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XG4gIGNvbnN0IGZvcm1Db250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1mb3JtJyk7XG5cbiAgY29uc3QgdGl0bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoNCcpO1xuICB0aXRsZS5pbm5lckhUTUwgPSBcIkFkZCB5b3VyIHJldmlld1wiO1xuXG4gIGZvcm1Db250YWluZXIuYXBwZW5kQ2hpbGQodGl0bGUpO1xuXG4gIGNvbnN0IGZvcm0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdmb3JtJyk7XG4gIGZvcm0uc2V0QXR0cmlidXRlKCdtZXRob2QnLCAnaHR0cDovL2xvY2FsaG9zdDoxMzM3L3Jldmlld3MvJyk7XG4gIGZvcm0uc2V0QXR0cmlidXRlKCdhY3Rpb24nLCAncG9zdCcpO1xuXG4gIGNvbnN0IGhpZGRlbklkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgaGlkZGVuSWQuc2V0QXR0cmlidXRlKCdpZCcsICdyZXN0YXVyYW50X2lkJyk7XG4gIGhpZGRlbklkLnNldEF0dHJpYnV0ZSgnbmFtZScsICdyZXN0YXVyYW50X2lkJyk7XG4gIGhpZGRlbklkLnNldEF0dHJpYnV0ZSgndHlwZScsICdoaWRkZW4nKTtcbiAgaGlkZGVuSWQuc2V0QXR0cmlidXRlKCd2YWx1ZScsIHJlc3RhdXJhbnQuaWQpO1xuXG4gIGZvcm0uYXBwZW5kQ2hpbGQoaGlkZGVuSWQpO1xuXG4gIGNvbnN0IGRpdk5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICBjb25zdCBsYWJlbE5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuICBsYWJlbE5hbWUuc2V0QXR0cmlidXRlKCdmb3InLCAnbmFtZScpO1xuICBsYWJlbE5hbWUuaW5uZXJIVE1MID0gJ1lvdXIgTmFtZSc7XG4gIGRpdk5hbWUuYXBwZW5kQ2hpbGQobGFiZWxOYW1lKTtcblxuICBjb25zdCBpbnB1dE5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICBpbnB1dE5hbWUuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQnKTtcbiAgaW5wdXROYW1lLnNldEF0dHJpYnV0ZSgnaWQnLCAnbmFtZScpO1xuICBpbnB1dE5hbWUuc2V0QXR0cmlidXRlKCduYW1lJywgJ25hbWUnKTtcbiAgaW5wdXROYW1lLnNldEF0dHJpYnV0ZSgncmVxdWlyZWQnLCAnJyk7XG4gIGRpdk5hbWUuYXBwZW5kQ2hpbGQoaW5wdXROYW1lKTtcblxuICBmb3JtLmFwcGVuZENoaWxkKGRpdk5hbWUpO1xuXG4gIGNvbnN0IGRpdlJhdGluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGNvbnN0IGxhYmVsUmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGFiZWwnKTtcbiAgbGFiZWxSYXRpbmcuc2V0QXR0cmlidXRlKCdmb3InLCAncmF0aW5nJyk7XG4gIGxhYmVsUmF0aW5nLmlubmVySFRNTCA9ICdSYXRpbmcnO1xuICBkaXZSYXRpbmcuYXBwZW5kQ2hpbGQobGFiZWxSYXRpbmcpO1xuXG4gIGNvbnN0IGlucHV0UmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgaW5wdXRSYXRpbmcuc2V0QXR0cmlidXRlKCd0eXBlJywgJ251bWJlcicpO1xuICBpbnB1dFJhdGluZy5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3JhdGluZycpO1xuICBpbnB1dFJhdGluZy5zZXRBdHRyaWJ1dGUoJ25hbWUnLCAncmF0aW5nJyk7XG4gIGlucHV0UmF0aW5nLnNldEF0dHJpYnV0ZSgnc3RlcCcsIDEpO1xuICBpbnB1dFJhdGluZy5zZXRBdHRyaWJ1dGUoJ21pbicsIDEpO1xuICBpbnB1dFJhdGluZy5zZXRBdHRyaWJ1dGUoJ21heCcsIDUpO1xuICBkaXZSYXRpbmcuYXBwZW5kQ2hpbGQoaW5wdXRSYXRpbmcpO1xuXG4gIGZvcm0uYXBwZW5kQ2hpbGQoZGl2UmF0aW5nKTtcblxuICBjb25zdCBkaXZDb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGNvbnN0IGxhYmVsQ29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuICBsYWJlbENvbW1lbnRzLnNldEF0dHJpYnV0ZSgnZm9yJywgJ2NvbW1lbnRzJyk7XG4gIGxhYmVsQ29tbWVudHMuaW5uZXJIVE1MID0gJ1lvdXIgY29tbWVudHMnO1xuICBkaXZDb21tZW50cy5hcHBlbmRDaGlsZChsYWJlbENvbW1lbnRzKTtcblxuICBjb25zdCBpbnB1dENvbW1lbnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcbiAgaW5wdXRDb21tZW50cy5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NvbW1lbnRzJyk7XG4gIGlucHV0Q29tbWVudHMuc2V0QXR0cmlidXRlKCduYW1lJywgJ2NvbW1lbnRzJyk7XG5cbiAgZGl2Q29tbWVudHMuYXBwZW5kQ2hpbGQoaW5wdXRDb21tZW50cyk7XG4gIGZvcm0uYXBwZW5kQ2hpbGQoZGl2Q29tbWVudHMpO1xuXG4gIGNvbnN0IGRpdkJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGNvbnN0IHN1Ym1pdEJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xuICBzdWJtaXRCdXR0b24uc2V0QXR0cmlidXRlKCd0eXBlJywgJ3N1Ym1pdCcpO1xuICBzdWJtaXRCdXR0b24uc2V0QXR0cmlidXRlKCdpZCcsICdzdWJtaXQnKTtcbiAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnYnV0dG9uJyk7XG4gIHN1Ym1pdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ3JvbGUnLCAnYnV0dG9uJyk7XG4gIHN1Ym1pdEJ1dHRvbi5pbm5lckhUTUwgPSAnU3VibWl0IHlvdXIgcmV2aWV3JztcblxuICBmb3JtLmFwcGVuZENoaWxkKHN1Ym1pdEJ1dHRvbik7XG5cbiAgZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCBhZGRBbmRQb3N0UmV2aWV3KTtcblxuICBmb3JtQ29udGFpbmVyLmFwcGVuZENoaWxkKGZvcm0pO1xufVxuXG5wb3N0UmV2aWV3ID0gKHJldmlldykgPT4ge1xuICBkZWxldGUgcmV2aWV3LmlzX3BlbmRpbmc7XG5cbiAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHsnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLCAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnfSk7XG4gIGNvbnN0IGJvZHkgPSBKU09OLnN0cmluZ2lmeShyZXZpZXcpO1xuXG4gIGZldGNoKCdodHRwOi8vbG9jYWxob3N0OjEzMzcvcmV2aWV3cy8nLCB7XG4gICAgbWV0aG9kOiAncG9zdCcsXG4gICAgbW9kZTogJ2NvcnMnLFxuICAgIGhlYWRlcnM6IGhlYWRlcnMsXG4gICAgYm9keTogYm9keVxuICB9KS50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAvLyBJZiB0aGUgcmVzcG9uc2UgaXMgb2ssIHJlbW92ZSB0aGUgaXNfcGVuZGluZyBmbGFnIGFuZCB1cGRhdGUgdGhlIHJlY29yZCBpbiB0aGUgZGF0YWJhc2VcbiAgICBpZiAoKHJlc3BvbnNlLnN0YXR1cyA9PSAyMDApIHx8IChyZXNwb25zZS5zdGF0dXMgPT0gMjAxKSkge1xuICAgICAgREJIZWxwZXIub3BlbkRCKCkudGhlbihkYiA9PiB7XG4gICAgICAgIGNvbnN0IHR4ID0gZGIudHJhbnNhY3Rpb24oJ3Jldmlld3MnLCAncmVhZHdyaXRlJyk7XG4gICAgICAgIGNvbnN0IHN0b3JlID0gdHgub2JqZWN0U3RvcmUoJ3Jldmlld3MnKTtcbiAgICAgICAgcmV0dXJuIHN0b3JlLnB1dChyZXZpZXcpO1xuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXNwb25zZSBzdGF0dXMgaXMgbm90IDIwMCBvciAyMDEnKVxuICAgIH1cbiAgfSkuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKCdDb3VsZCBub3QgcG9zdCB0aGUgcmV2aWV3OiAnICsgZXJyKSk7XG59XG5cblxuYWRkQW5kUG9zdFJldmlldyA9IChldmVudCkgPT4ge1xuICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gIGNvbnN0IHVybCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uKSxcbiAgICAgICAgcmVzdGF1cmFudF9pZF91cmwgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnaWQnKTtcblxuICBjb25zdCBkYXRhID0ge1xuICAgIHJlc3RhdXJhbnRfaWQ6IHBhcnNlSW50KHJlc3RhdXJhbnRfaWRfdXJsLCAxMCksXG4gICAgbmFtZTogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ25hbWUnKS52YWx1ZSxcbiAgICByYXRpbmc6IHBhcnNlSW50KGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyYXRpbmcnKS52YWx1ZSwgMTApLFxuICAgIGNvbW1lbnRzOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29tbWVudHMnKS52YWx1ZSxcbiAgICBpc19wZW5kaW5nOiB0cnVlXG4gIH1cblxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmFtZScpLnZhbHVlID0gJyc7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyYXRpbmcnKS52YWx1ZSA9ICcnO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29tbWVudHMnKS52YWx1ZSA9ICcnO1xuXG4gIC8vIGFwcGVuZCB0aGUgcmV2aWV3IHRvIHRoZSBsaXN0XG4gIHVwZGF0ZVJldmlld3NVSShbZGF0YV0pO1xuXG4gIC8vIHNhdmUgdGhlIHJldmlldyBpbiB0aGUgbG9jYWwgZGF0YWJhc2VcbiAgREJIZWxwZXIuc2F2ZVJldmlld3NMb2NhbGx5KFtkYXRhXSlcbiAgICAudGhlbihyZXNwb25zZSA9PiBjb25zb2xlLmxvZygnUmV2aWV3IHNhdmVkIGxvY2FsbHknKSlcbiAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKCdDb3VsZCBub3Qgc2F2ZSByZXZpZXdzIGxvY2FsbHknICsgZXJyKSk7XG5cbiAgaWYgKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IgJiYgJ1N5bmNNYW5hZ2VyJyBpbiB3aW5kb3cpIHtcbiAgICBjb25zb2xlLmxvZygnc2VydmljZSB3b3JrZXIgaW4gbmF2aWdhdG9yIGV0Yy4nKTtcbiAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWFkeVxuICAgICAgLnRoZW4ocmVnID0+IHtcbiAgICAgICAgcmVnLnN5bmMucmVnaXN0ZXIoJ3N1Ym1pdFJldmlld3MnKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgLy8gc3lzdGVtIHdhcyB1bmFibGUgdG8gcmVnaXN0ZXIgZm9yIGEgc3luYywgc2VuZCBub3JtYWxcbiAgICAgICAgcG9zdFJldmlldyhkYXRhKTtcbiAgICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIC8vIGlmIHRoZXJlIGlzIG5vIHNlcnZpY2Ugd29ya2VyXG4gICAgcG9zdFJldmlldyhkYXRhKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZCByZXN0YXVyYW50IG5hbWUgdG8gdGhlIGJyZWFkY3J1bWIgbmF2aWdhdGlvbiBtZW51XG4gKi9cbmZpbGxCcmVhZGNydW1iID0gKHJlc3RhdXJhbnQ9c2VsZi5yZXN0YXVyYW50KSA9PiB7XG4gIGNvbnN0IGJyZWFkY3J1bWIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnJlYWRjcnVtYicpO1xuICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gIGNvbnN0IHNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gIHNwYW4uc2V0QXR0cmlidXRlKCdhcmlhLWN1cnJlbnQnLCAncGFnZScpO1xuICBsaS5hcHBlbmRDaGlsZChzcGFuKTtcbiAgc3Bhbi5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XG4gIGJyZWFkY3J1bWIuYXBwZW5kQ2hpbGQobGkpO1xufVxuXG4vKipcbiAqIEdldCBhIHBhcmFtZXRlciBieSBuYW1lIGZyb20gcGFnZSBVUkwuXG4gKi9cbmdldFBhcmFtZXRlckJ5TmFtZSA9IChuYW1lLCB1cmwpID0+IHtcbiAgaWYgKCF1cmwpXG4gICAgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG4gIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtcXF1dL2csICdcXFxcJCYnKTtcbiAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGBbPyZdJHtuYW1lfSg9KFteJiNdKil8JnwjfCQpYCksXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWModXJsKTtcbiAgaWYgKCFyZXN1bHRzKVxuICAgIHJldHVybiBudWxsO1xuICBpZiAoIXJlc3VsdHNbMl0pXG4gICAgcmV0dXJuICcnO1xuICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMl0ucmVwbGFjZSgvXFwrL2csICcgJykpO1xufVxuIl0sImZpbGUiOiJyZXN0YXVyYW50X2luZm8uanMifQ==
