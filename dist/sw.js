const CACHE_NAME = 'restaurants-review-cache-v1';
const urlsToCache = [
	'/',
	'/manifest.json',
	'/index.html',
	'/restaurant.html',
	'/css/styles.css',
	'/js/idb-min.js',
	'/js/dbhelper-min.js',
	'/js/main-min.js',
	'/js/restaurant_info-min.js',
	'/img/1.jpg',
	'/img/1-small.jpg',
	'/img/1-small@2x.jpg',
	'/img/2.jpg',
	'/img/2-small.jpg',
	'/img/2-small@2x.jpg',
	'/img/3.jpg',
	'/img/3-small.jpg',
	'/img/3-small@2x.jpg',
	'/img/4.jpg',
	'/img/4-small.jpg',
	'/img/4-small@2x.jpg',
	'/img/5.jpg',
	'/img/5-small.jpg',
	'/img/5-small@2x.jpg',
	'/img/6.jpg',
	'/img/6-small.jpg',
	'/img/6-small@2x.jpg',
	'/img/7.jpg',
	'/img/7-small.jpg',
	'/img/7-small@2x.jpg',
	'/img/8.jpg',
	'/img/8-small.jpg',
	'/img/8-small@2x.jpg',
	'/img/9.jpg',
	'/img/9-small.jpg',
	'/img/9-small@2x.jpg',
	'/img/10.jpg',
	'/img/10-small.jpg',
	'/img/10-small@2x.jpg' //,
	// '/img/udacity-logo-192.png',
	// '/img/udacity-logo-512.png'
];

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').then((registration) => {
			// Registration was successful
			console.log('ServiceWorker registration successful with scope: ', registration.scope);
		}, (err) => {
			// Registration failed
			console.log('ServiceWorker registration failed: ', err);
		});
	});
}

self.addEventListener('install', (event) => {
	// Perform install steps
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => {
				console.log('Opened cache');
				return cache.addAll(urlsToCache);
			})
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	event.respondWith(
		caches.match(request)
			.then((response) => {
				if (response) {
					return response;
				}
				return fetch(request).then((response) => {
					var responseToCache = response.clone();
					caches.open(CACHE_NAME).then(function(cache) {
						cache.put(request, responseToCache).catch(function(err) {
							console.warn(request.url + ' ' + err.message);
						});
					}).catch((err) => {
						console.warn("Error in ", request, err);
					});
					return response;
				});
			})
	);
});

self.addEventListener('sync', (event) => {
	if (event.tag === 'submitReviews') {
		event.waitUntil(submitReviews())
	}
});

function getLocalReviews() {
	return idb.open('mws', 1).then(db => {
		const tx = db.transaction('reviews', 'readonly');
		const store = tx.objectStore('reviews');
		return store.getAll()
	});
}

function submitReview(review) {
	const headers = new Headers({'Accept': 'application/json', 'Content-Type': 'application/json; charset=utf-8'});
  	const body = JSON.stringify(review);
	return fetch('http://localhost:1337/reviews/', 
		{
			method: 'POST',
			headers: headers,
			body: body
		});
}

function submitReviews() {
	self.importScripts('/js/idb-min.js')
	getLocalReviews()
		.then(reviews => {
			return Promise.all(reviews.map(review => {
				// If review is marked as pending, then send
				if (review.hasOwnProperty('is_pending')) {
					// Remove the 'id_pending' flag from the temporary record
					delete review.is_pending;
					// submit the review
					return submitReview(review)
						// if the review has been successfully sent,
						// remove the 'is_pending' flag from the record in the database
						// so it is not sent again
						.then(response => {
							if ((response.status == 200) || (response.status == 201)) {
								idb.open('mws', 1).then(db => {
									const tx = db.transaction('reviews', 'readwrite');
									const store = tx.objectStore('reviews');
									return store.put(review);
								});
							} else {
								throw new Error('Response was not ok');
							}
						})
				}
			}))
		})
		.then(() => console.log('reviews could be sent'))
		.catch(err => console.log('There was a problem submitting the reviews: ' + err));;
}
