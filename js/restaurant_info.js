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
  console.log(restaurant);
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  setFavButton(restaurant);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  const image_name = DBHelper.imageUrlForRestaurant(restaurant);
  image.src = image_name + "-small@2x.jpg";
  image.setAttribute('srcset', image_name + ' 2x');
  image.setAttribute('alt', 'Image of ' + restaurant.name + ' Restaurant');

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
 * Add favorite button
 */
setFavButton = (restaurant = self.restaurant) => {
  const favButton = document.getElementById("favButton");
  if (restaurant.is_favorite) {
    favButton.innerHTML = "Remove from favorites";
  } else {
    favButton.innerHTML = "Add to favorites";
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
  
  // Update in local
  DBHelper.saveRestaurantsLocally([restaurant])
    .catch(err => console.log(err));
  
  // Update in server
  const headers = new Headers({'Content-Type': 'application/json'});
  fetch(`http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`,
    {method: 'put', headers: headers})
    .then(response => console.log(response.statusText))
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
    console.log(reviews);
    if (reviews.length > 0) {
      updateReviews(reviews);
    }
  });
}

/**
* Update reviews
*/
updateReviews = (reviews) => {
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

addAndPostReview = (event) => {
  event.preventDefault();
  const data = {
    restaurant_id: event.srcElement[0].value,
    name: document.getElementById('name').value,
    rating: document.getElementById('rating').value,
    comments: document.getElementById('comments').value
  }

  console.log(data);

  updateReviews([data]);
  DBHelper.saveReviewsLocally([data])
    .catch((err) => console.log(err));

  const headers = new Headers({'Content-Type': 'application/json'});
  const body = JSON.stringify(data);
  
  fetch('http://localhost:1337/reviews/', {
    method: 'post',
    headers: headers,
    body: body
  }).then((response) => console.log("New data submitted to the server " + response.statusText))
    .catch((err) => console.log(err));
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
