const CACHE_NAME = 'restaurants-review-cache-v1';
var urlsToCache = [
	'/',
	'/index.html',
	'/restaurant.html',
	'/css/styles.css',
	'/data/restaurants.json',
	'/js/dbhelper.js',
	'/js/main.js',
	'/js/restaurant_info.js',
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
	'/img/10-small@2x.jpg'
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