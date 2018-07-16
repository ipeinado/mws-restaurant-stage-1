let restaurant;var map;window.initMap=(()=>{fetchRestaurantFromURL((e,t)=>{e?console.error(e):(self.map=new google.maps.Map(document.getElementById("map"),{zoom:16,center:t.latlng,scrollwheel:!1}),fillBreadcrumb(),DBHelper.mapMarkerForRestaurant(self.restaurant,self.map))})}),fetchRestaurantFromURL=(e=>{if(self.restaurant)return void e(null,self.restaurant);const t=getParameterByName("id");t?DBHelper.fetchRestaurantById(t,(t,n)=>{self.restaurant=n,n?(fillRestaurantHTML(),e(null,n)):console.error(t)}):(error="No restaurant id in URL",e(error,null))}),fillRestaurantHTML=((e=self.restaurant)=>{document.getElementById("restaurant-name").innerHTML=e.name,setFavButton(e),document.getElementById("restaurant-address").innerHTML=e.address;const t=document.getElementById("restaurant-img"),n=DBHelper.imageUrlForRestaurant(e),r="Image of "+e.name+" Restaurant",a="(max-width: 640px) 100vw, 50vw",s=n+"-medium.jpg 570w, "+n+".jpg 800w",i=n+"-medium.webp 570w, "+n+".webp 800w",o=document.createElement("source");o.setAttribute("type","image/webp"),o.setAttribute("srcset",i),o.setAttribute("sizes",a),o.setAttribute("alt",r),t.appendChild(o);const l=document.createElement("source");l.setAttribute("type","image/jpeg"),l.setAttribute("srcset",s),l.setAttribute("sizes",a),l.setAttribute("alt",r),t.appendChild(l);const d=document.createElement("img");d.setAttribute("src",n+".jpg"),d.setAttribute("alt",r),t.appendChild(d),document.getElementById("restaurant-cuisine").innerHTML=e.cuisine_type,e.operating_hours&&fillRestaurantHoursHTML(),fillReviewsHTML(),createReviewForm()}),setFavButton=((e=self.restaurant)=>{const t=document.getElementById("favButton");e.is_favorite?(t.innerHTML="&#10084; Remove from favorites",t.setAttribute("class","fav-button favorite")):(t.innerHTML="<span class='heart'>&#10084;</span> Add to favorites",t.setAttribute("class","fav-button non-favorite")),t.addEventListener("click",favButtonClick)}),favButtonClick=((e,t=self.restaurant)=>{e.preventDefault(),t.is_favorite=!t.is_favorite,setFavButton(t),DBHelper.saveRestaurantsLocally([t]).catch(e=>console.log(e));const n=new Headers({"Content-Type":"application/json"});fetch(`http://localhost:1337/restaurants/${t.id}/?is_favorite=${t.is_favorite}`,{method:"put",headers:n}).catch(e=>console.log(e))}),fillRestaurantHoursHTML=((e=self.restaurant.operating_hours)=>{const t=document.getElementById("restaurant-hours");for(let n in e){const r=document.createElement("tr"),a=document.createElement("td");a.innerHTML=n,r.appendChild(a);const s=document.createElement("td");s.innerHTML=e[n],r.appendChild(s),t.appendChild(r)}}),fillReviewsHTML=((e=self.restaurant)=>{const t=document.getElementById("reviews-container"),n=document.getElementById("reviews-list"),r=document.createElement("h3");r.innerHTML="Reviews",t.insertBefore(r,n),DBHelper.fetchReviewsByRestaurant(e.id,(e,n)=>{if(e){const e=document.createElement("p");return e.innerHTML="Sorry, there was a problem downloading the reviews",void t.appendChild(e)}n.length>0&&updateReviewsUI(n)})}),updateReviewsUI=(e=>{const t=document.getElementById("reviews-list");e.forEach(e=>{const n=createReviewHTML(e);t.appendChild(n)})}),createReviewHTML=(e=>{const t=document.createElement("li"),n=document.createElement("p"),r=document.createElement("div"),a=document.createElement("div");r.className="header",a.className="review-content",t.appendChild(r),t.appendChild(a),n.className="reviewer-name",n.innerHTML=e.name,r.appendChild(n);const s=document.createElement("p");s.className="review-date",s.innerHTML=new Date(e.updatedAt).toLocaleDateString("en-US"),r.appendChild(s);const i=document.createElement("p");i.className="review-rating",i.innerHTML=`Rating: ${e.rating}`,a.appendChild(i);const o=document.createElement("p");return o.innerHTML=e.comments,a.appendChild(o),t}),createReviewForm=((e=self.restaurant)=>{const t=document.getElementById("reviews-form"),n=document.createElement("h4");n.innerHTML="Add your review",t.appendChild(n);const r=document.createElement("form");r.setAttribute("method","http://localhost:1337/reviews/"),r.setAttribute("action","post");const a=document.createElement("input");a.setAttribute("id","restaurant_id"),a.setAttribute("name","restaurant_id"),a.setAttribute("type","hidden"),a.setAttribute("value",e.id),r.appendChild(a);const s=document.createElement("div"),i=document.createElement("label");i.setAttribute("for","name"),i.innerHTML="Your Name",s.appendChild(i);const o=document.createElement("input");o.setAttribute("type","text"),o.setAttribute("id","name"),o.setAttribute("name","name"),o.setAttribute("required",""),s.appendChild(o),r.appendChild(s);const l=document.createElement("div"),d=document.createElement("label");d.setAttribute("for","rating"),d.innerHTML="Rating",l.appendChild(d);const c=document.createElement("input");c.setAttribute("type","number"),c.setAttribute("id","rating"),c.setAttribute("name","rating"),c.setAttribute("step",1),c.setAttribute("min",1),c.setAttribute("max",5),l.appendChild(c),r.appendChild(l);const u=document.createElement("div"),m=document.createElement("label");m.setAttribute("for","comments"),m.innerHTML="Your comments",u.appendChild(m);const p=document.createElement("textarea");p.setAttribute("id","comments"),p.setAttribute("name","comments"),u.appendChild(p),r.appendChild(u);document.createElement("div");const v=document.createElement("button");v.setAttribute("type","submit"),v.setAttribute("id","submit"),v.setAttribute("class","button"),v.setAttribute("role","button"),v.innerHTML="Submit your review",r.appendChild(v),r.addEventListener("submit",addAndPostReview),t.appendChild(r)}),postReview=(e=>{delete e.is_pending;const t=new Headers({Accept:"application/json","Content-Type":"application/json; charset=utf-8"}),n=JSON.stringify(e);fetch("http://localhost:1337/reviews/",{method:"post",mode:"cors",headers:t,body:n}).then(t=>{if(200!=t.status&&201!=t.status)throw new Error("response status is not 200 or 201");DBHelper.openDB().then(t=>{return t.transaction("reviews","readwrite").objectStore("reviews").put(e)})}).catch(e=>console.log("Could not post the review: "+e))}),addAndPostReview=(e=>{e.preventDefault();const t=new URL(window.location).searchParams.get("id"),n={restaurant_id:parseInt(t,10),name:document.getElementById("name").value,rating:parseInt(document.getElementById("rating").value,10),comments:document.getElementById("comments").value,is_pending:!0};document.getElementById("name").value="",document.getElementById("rating").value="",document.getElementById("comments").value="",updateReviewsUI([n]),DBHelper.saveReviewsLocally([n]).then(e=>console.log("Review saved locally")).catch(e=>console.log("Could not save reviews locally"+e)),"serviceWorker"in navigator&&"SyncManager"in window?(console.log("service worker in navigator etc."),navigator.serviceWorker.ready.then(e=>{e.sync.register("submitReviews")}).catch(e=>{postReview(n)})):postReview(n)}),fillBreadcrumb=((e=self.restaurant)=>{const t=document.getElementById("breadcrumb"),n=document.createElement("li"),r=document.createElement("span");r.setAttribute("aria-current","page"),n.appendChild(r),r.innerHTML=e.name,t.appendChild(n)}),getParameterByName=((e,t)=>{t||(t=window.location.href),e=e.replace(/[\[\]]/g,"\\$&");const n=new RegExp(`[?&]${e}(=([^&#]*)|&|#|$)`).exec(t);return n?n[2]?decodeURIComponent(n[2].replace(/\+/g," ")):"":null});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlc3RhdXJhbnRfaW5mby5qcyJdLCJuYW1lcyI6WyJyZXN0YXVyYW50IiwibWFwIiwid2luZG93IiwiaW5pdE1hcCIsImZldGNoUmVzdGF1cmFudEZyb21VUkwiLCJlcnJvciIsImNvbnNvbGUiLCJzZWxmIiwiZ29vZ2xlIiwibWFwcyIsIk1hcCIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJ6b29tIiwiY2VudGVyIiwibGF0bG5nIiwic2Nyb2xsd2hlZWwiLCJmaWxsQnJlYWRjcnVtYiIsIkRCSGVscGVyIiwibWFwTWFya2VyRm9yUmVzdGF1cmFudCIsImNhbGxiYWNrIiwiaWQiLCJnZXRQYXJhbWV0ZXJCeU5hbWUiLCJmZXRjaFJlc3RhdXJhbnRCeUlkIiwiZmlsbFJlc3RhdXJhbnRIVE1MIiwiaW5uZXJIVE1MIiwibmFtZSIsInNldEZhdkJ1dHRvbiIsImFkZHJlc3MiLCJwaWN0dXJlIiwiaW1hZ2VfbmFtZSIsImltYWdlVXJsRm9yUmVzdGF1cmFudCIsImFsdF90ZXh0Iiwic2l6ZXMiLCJzcmNzZXRfanBnIiwic3Jjc2V0X3dlYnAiLCJzb3VyY2UiLCJjcmVhdGVFbGVtZW50Iiwic2V0QXR0cmlidXRlIiwiYXBwZW5kQ2hpbGQiLCJpbWdfc3Jjc2V0IiwiaW1nIiwiY3Vpc2luZV90eXBlIiwib3BlcmF0aW5nX2hvdXJzIiwiZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwiLCJmaWxsUmV2aWV3c0hUTUwiLCJjcmVhdGVSZXZpZXdGb3JtIiwiZmF2QnV0dG9uIiwiaXNfZmF2b3JpdGUiLCJhZGRFdmVudExpc3RlbmVyIiwiZmF2QnV0dG9uQ2xpY2siLCJldmVudCIsInByZXZlbnREZWZhdWx0Iiwic2F2ZVJlc3RhdXJhbnRzTG9jYWxseSIsImNhdGNoIiwiZXJyIiwibG9nIiwiaGVhZGVycyIsIkhlYWRlcnMiLCJDb250ZW50LVR5cGUiLCJmZXRjaCIsIm1ldGhvZCIsIm9wZXJhdGluZ0hvdXJzIiwiaG91cnMiLCJrZXkiLCJyb3ciLCJkYXkiLCJ0aW1lIiwiY29udGFpbmVyIiwidWwiLCJ0aXRsZSIsImluc2VydEJlZm9yZSIsImZldGNoUmV2aWV3c0J5UmVzdGF1cmFudCIsInJldmlld3MiLCJub1Jldmlld3MiLCJsZW5ndGgiLCJ1cGRhdGVSZXZpZXdzVUkiLCJmb3JFYWNoIiwicmV2aWV3IiwiaXRlbSIsImNyZWF0ZVJldmlld0hUTUwiLCJsaSIsImhlYWRlciIsImNvbnRlbnQiLCJjbGFzc05hbWUiLCJkYXRlIiwiRGF0ZSIsInVwZGF0ZWRBdCIsInRvTG9jYWxlRGF0ZVN0cmluZyIsInJhdGluZyIsImNvbW1lbnRzIiwiZm9ybUNvbnRhaW5lciIsImZvcm0iLCJoaWRkZW5JZCIsImRpdk5hbWUiLCJsYWJlbE5hbWUiLCJpbnB1dE5hbWUiLCJkaXZSYXRpbmciLCJsYWJlbFJhdGluZyIsImlucHV0UmF0aW5nIiwiZGl2Q29tbWVudHMiLCJsYWJlbENvbW1lbnRzIiwiaW5wdXRDb21tZW50cyIsInN1Ym1pdEJ1dHRvbiIsImFkZEFuZFBvc3RSZXZpZXciLCJwb3N0UmV2aWV3IiwiaXNfcGVuZGluZyIsIkFjY2VwdCIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5IiwibW9kZSIsInRoZW4iLCJyZXNwb25zZSIsInN0YXR1cyIsIkVycm9yIiwib3BlbkRCIiwiZGIiLCJ0cmFuc2FjdGlvbiIsIm9iamVjdFN0b3JlIiwicHV0IiwicmVzdGF1cmFudF9pZF91cmwiLCJVUkwiLCJsb2NhdGlvbiIsInNlYXJjaFBhcmFtcyIsImdldCIsImRhdGEiLCJyZXN0YXVyYW50X2lkIiwicGFyc2VJbnQiLCJ2YWx1ZSIsInNhdmVSZXZpZXdzTG9jYWxseSIsIm5hdmlnYXRvciIsInNlcnZpY2VXb3JrZXIiLCJyZWFkeSIsInJlZyIsInN5bmMiLCJyZWdpc3RlciIsImJyZWFkY3J1bWIiLCJzcGFuIiwidXJsIiwiaHJlZiIsInJlcGxhY2UiLCJyZXN1bHRzIiwiUmVnRXhwIiwiZXhlYyIsImRlY29kZVVSSUNvbXBvbmVudCJdLCJtYXBwaW5ncyI6IkFBQUEsSUFB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LFFBQVFrRCxJQUFJLHlCQUM3QkYsTUFBTUMsR0FBT2pELFFBQVFrRCxJQUFJLGlDQUFtQ0QsSUFFM0Qsa0JBQW1CNEUsV0FBYSxnQkFBaUJqSSxRQUNuREksUUFBUWtELElBQUksb0NBQ1oyRSxVQUFVQyxjQUFjQyxNQUNyQnJCLEtBQUtzQixJQUNKQSxFQUFJQyxLQUFLQyxTQUFTLG1CQUVuQmxGLE1BQU1DLElBRUxrRCxXQUFXcUIsTUFJZnJCLFdBQVdxQixLQU9mN0csZUFBaUIsRUFBQ2pCLEVBQVdPLEtBQUtQLGNBQ2hDLE1BQU15SSxFQUFhOUgsU0FBU0MsZUFBZSxjQUNyQ3FFLEVBQUt0RSxTQUFTMEIsY0FBYyxNQUM1QnFHLEVBQU8vSCxTQUFTMEIsY0FBYyxRQUNwQ3FHLEVBQUtwRyxhQUFhLGVBQWdCLFFBQ2xDMkMsRUFBRzFDLFlBQVltRyxHQUNmQSxFQUFLakgsVUFBWXpCLEVBQVcwQixLQUM1QitHLEVBQVdsRyxZQUFZMEMsS0FNekIzRCxtQkFBcUIsRUFBQ0ksRUFBTWlILEtBQ3JCQSxJQUNIQSxFQUFNekksT0FBT3lILFNBQVNpQixNQUN4QmxILEVBQU9BLEVBQUttSCxRQUFRLFVBQVcsUUFDL0IsTUFDRUMsRUFEWSxJQUFJQyxjQUFjckgsc0JBQ2RzSCxLQUFLTCxHQUN2QixPQUFLRyxFQUVBQSxFQUFRLEdBRU5HLG1CQUFtQkgsRUFBUSxHQUFHRCxRQUFRLE1BQU8sTUFEM0MsR0FGQSIsInNvdXJjZXNDb250ZW50IjpbImxldCByZXN0YXVyYW50O1xudmFyIG1hcDtcblxuLyoqXG4gKiBJbml0aWFsaXplIEdvb2dsZSBtYXAsIGNhbGxlZCBmcm9tIEhUTUwuXG4gKi9cbndpbmRvdy5pbml0TWFwID0gKCkgPT4ge1xuICBmZXRjaFJlc3RhdXJhbnRGcm9tVVJMKChlcnJvciwgcmVzdGF1cmFudCkgPT4ge1xuICAgIGlmIChlcnJvcikgeyAvLyBHb3QgYW4gZXJyb3IhXG4gICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKSwge1xuICAgICAgICB6b29tOiAxNixcbiAgICAgICAgY2VudGVyOiByZXN0YXVyYW50LmxhdGxuZyxcbiAgICAgICAgc2Nyb2xsd2hlZWw6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGZpbGxCcmVhZGNydW1iKCk7XG4gICAgICBEQkhlbHBlci5tYXBNYXJrZXJGb3JSZXN0YXVyYW50KHNlbGYucmVzdGF1cmFudCwgc2VsZi5tYXApO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogR2V0IGN1cnJlbnQgcmVzdGF1cmFudCBmcm9tIHBhZ2UgVVJMLlxuICovXG5mZXRjaFJlc3RhdXJhbnRGcm9tVVJMID0gKGNhbGxiYWNrKSA9PiB7XG4gIGlmIChzZWxmLnJlc3RhdXJhbnQpIHsgLy8gcmVzdGF1cmFudCBhbHJlYWR5IGZldGNoZWQhXG4gICAgY2FsbGJhY2sobnVsbCwgc2VsZi5yZXN0YXVyYW50KVxuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpZCA9IGdldFBhcmFtZXRlckJ5TmFtZSgnaWQnKTtcbiAgaWYgKCFpZCkgeyAvLyBubyBpZCBmb3VuZCBpbiBVUkxcbiAgICBlcnJvciA9ICdObyByZXN0YXVyYW50IGlkIGluIFVSTCdcbiAgICBjYWxsYmFjayhlcnJvciwgbnVsbCk7XG4gIH0gZWxzZSB7XG4gICAgREJIZWxwZXIuZmV0Y2hSZXN0YXVyYW50QnlJZChpZCwgKGVycm9yLCByZXN0YXVyYW50KSA9PiB7XG4gICAgICBzZWxmLnJlc3RhdXJhbnQgPSByZXN0YXVyYW50O1xuICAgICAgaWYgKCFyZXN0YXVyYW50KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBmaWxsUmVzdGF1cmFudEhUTUwoKTtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3RhdXJhbnQpXG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgcmVzdGF1cmFudCBIVE1MIGFuZCBhZGQgaXQgdG8gdGhlIHdlYnBhZ2VcbiAqL1xuZmlsbFJlc3RhdXJhbnRIVE1MID0gKHJlc3RhdXJhbnQgPSBzZWxmLnJlc3RhdXJhbnQpID0+IHtcbiAgY29uc3QgbmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN0YXVyYW50LW5hbWUnKTtcbiAgbmFtZS5pbm5lckhUTUwgPSByZXN0YXVyYW50Lm5hbWU7XG5cbiAgc2V0RmF2QnV0dG9uKHJlc3RhdXJhbnQpO1xuXG4gIGNvbnN0IGFkZHJlc3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1hZGRyZXNzJyk7XG4gIGFkZHJlc3MuaW5uZXJIVE1MID0gcmVzdGF1cmFudC5hZGRyZXNzO1xuXG4gIGNvbnN0IHBpY3R1cmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVzdGF1cmFudC1pbWcnKTtcbiAgY29uc3QgaW1hZ2VfbmFtZSA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcbiAgY29uc3QgYWx0X3RleHQgPSAnSW1hZ2Ugb2YgJyArIHJlc3RhdXJhbnQubmFtZSArICcgUmVzdGF1cmFudCc7XG4gIGNvbnN0IHNpemVzID0gJyhtYXgtd2lkdGg6IDY0MHB4KSAxMDB2dywgNTB2dyc7XG5cbiAgY29uc3Qgc3Jjc2V0X2pwZyA9IGltYWdlX25hbWUgKyAnLW1lZGl1bS5qcGcgNTcwdywgJyArIGltYWdlX25hbWUgKyAnLmpwZyA4MDB3JztcbiAgY29uc3Qgc3Jjc2V0X3dlYnAgPSBpbWFnZV9uYW1lICsgJy1tZWRpdW0ud2VicCA1NzB3LCAnICsgaW1hZ2VfbmFtZSArICcud2VicCA4MDB3JztcblxuICBjb25zdCBzb3VyY2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzb3VyY2UnKTtcbiAgc291cmNlLnNldEF0dHJpYnV0ZSgndHlwZScsICdpbWFnZS93ZWJwJyk7XG4gIHNvdXJjZS5zZXRBdHRyaWJ1dGUoJ3NyY3NldCcsIHNyY3NldF93ZWJwKTtcbiAgc291cmNlLnNldEF0dHJpYnV0ZSgnc2l6ZXMnLCBzaXplcyk7XG4gIHNvdXJjZS5zZXRBdHRyaWJ1dGUoJ2FsdCcsIGFsdF90ZXh0KTtcblxuICBwaWN0dXJlLmFwcGVuZENoaWxkKHNvdXJjZSk7XG5cbiAgY29uc3QgaW1nX3NyY3NldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NvdXJjZScpO1xuICBpbWdfc3Jjc2V0LnNldEF0dHJpYnV0ZSgndHlwZScsICdpbWFnZS9qcGVnJyk7XG4gIGltZ19zcmNzZXQuc2V0QXR0cmlidXRlKCdzcmNzZXQnLCBzcmNzZXRfanBnKTtcbiAgaW1nX3NyY3NldC5zZXRBdHRyaWJ1dGUoJ3NpemVzJywgc2l6ZXMpO1xuICBpbWdfc3Jjc2V0LnNldEF0dHJpYnV0ZSgnYWx0JywgYWx0X3RleHQpO1xuXG4gIHBpY3R1cmUuYXBwZW5kQ2hpbGQoaW1nX3NyY3NldCk7XG5cbiAgY29uc3QgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XG4gIGltZy5zZXRBdHRyaWJ1dGUoJ3NyYycsIGltYWdlX25hbWUgKyAnLmpwZycpO1xuICBpbWcuc2V0QXR0cmlidXRlKCdhbHQnLCBhbHRfdGV4dCk7XG5cbiAgcGljdHVyZS5hcHBlbmRDaGlsZChpbWcpO1xuXG5cbiAgLy8gaW1hZ2UuY2xhc3NOYW1lID0gJ3Jlc3RhdXJhbnQtaW1nJztcbiAgLy8gY29uc3QgaW1hZ2VfbmFtZSA9IERCSGVscGVyLmltYWdlVXJsRm9yUmVzdGF1cmFudChyZXN0YXVyYW50KTtcbiAgLy8gaW1hZ2Uuc3JjID0gaW1hZ2VfbmFtZSArIFwiLXNtYWxsQDJ4LmpwZ1wiO1xuICAvLyBpbWFnZS5zZXRBdHRyaWJ1dGUoJ3NyY3NldCcsIGltYWdlX25hbWUgKyAnIDJ4Jyk7XG4gIC8vIGltYWdlLnNldEF0dHJpYnV0ZSgnYWx0JywgJ0ltYWdlIG9mICcgKyByZXN0YXVyYW50Lm5hbWUgKyAnIFJlc3RhdXJhbnQnKTtcblxuICBjb25zdCBjdWlzaW5lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtY3Vpc2luZScpO1xuICBjdWlzaW5lLmlubmVySFRNTCA9IHJlc3RhdXJhbnQuY3Vpc2luZV90eXBlO1xuXG4gIC8vIGZpbGwgb3BlcmF0aW5nIGhvdXJzXG4gIGlmIChyZXN0YXVyYW50Lm9wZXJhdGluZ19ob3Vycykge1xuICAgIGZpbGxSZXN0YXVyYW50SG91cnNIVE1MKCk7XG4gIH1cbiAgLy8gZmlsbCByZXZpZXdzXG4gIGZpbGxSZXZpZXdzSFRNTCgpO1xuXG4gIC8vIGNyZWF0ZSByZXZpZXcgZm9ybVxuICBjcmVhdGVSZXZpZXdGb3JtKCk7XG59XG5cbi8qKlxuICogU2V0IGZhdm9yaXRlIGJ1dHRvblxuICovXG5zZXRGYXZCdXR0b24gPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBmYXZCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZhdkJ1dHRvblwiKTtcbiAgaWYgKHJlc3RhdXJhbnQuaXNfZmF2b3JpdGUpIHtcbiAgICBmYXZCdXR0b24uaW5uZXJIVE1MID0gXCImIzEwMDg0OyBSZW1vdmUgZnJvbSBmYXZvcml0ZXNcIjtcbiAgICBmYXZCdXR0b24uc2V0QXR0cmlidXRlKCdjbGFzcycsICdmYXYtYnV0dG9uIGZhdm9yaXRlJyk7XG4gIH0gZWxzZSB7XG4gICAgZmF2QnV0dG9uLmlubmVySFRNTCA9IFwiPHNwYW4gY2xhc3M9J2hlYXJ0Jz4mIzEwMDg0Ozwvc3Bhbj4gQWRkIHRvIGZhdm9yaXRlc1wiO1xuICAgIGZhdkJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2Zhdi1idXR0b24gbm9uLWZhdm9yaXRlJyk7XG4gIH1cbiAgZmF2QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZmF2QnV0dG9uQ2xpY2spO1xufVxuXG4vKipcbiAqICBDbGljayBmYXZvcml0ZSBidXR0b25cbiAqL1xuIGZhdkJ1dHRvbkNsaWNrID0gKGV2ZW50LCByZXN0YXVyYW50ID0gc2VsZi5yZXN0YXVyYW50KSA9PiB7XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gIHJlc3RhdXJhbnQuaXNfZmF2b3JpdGUgPSAhcmVzdGF1cmFudC5pc19mYXZvcml0ZTtcbiAgc2V0RmF2QnV0dG9uKHJlc3RhdXJhbnQpO1xuICBcbiAgLy8gVXBkYXRlIHJlY29yZCBpbiBsb2NhbCBkYXRhYmFzZVxuICBEQkhlbHBlci5zYXZlUmVzdGF1cmFudHNMb2NhbGx5KFtyZXN0YXVyYW50XSlcbiAgICAuY2F0Y2goZXJyID0+IGNvbnNvbGUubG9nKGVycikpO1xuICBcbiAgLy8gVXBkYXRlIHJlY29yZCBpbiBzZXJ2ZXJcbiAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKHsnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nfSk7XG4gIGZldGNoKGBodHRwOi8vbG9jYWxob3N0OjEzMzcvcmVzdGF1cmFudHMvJHtyZXN0YXVyYW50LmlkfS8/aXNfZmF2b3JpdGU9JHtyZXN0YXVyYW50LmlzX2Zhdm9yaXRlfWAsXG4gICAge21ldGhvZDogJ3B1dCcsIGhlYWRlcnM6IGhlYWRlcnN9KVxuICAgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coZXJyKSk7XG4gfSBcblxuXG5cbi8qKlxuICogQ3JlYXRlIHJlc3RhdXJhbnQgb3BlcmF0aW5nIGhvdXJzIEhUTUwgdGFibGUgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZS5cbiAqL1xuZmlsbFJlc3RhdXJhbnRIb3Vyc0hUTUwgPSAob3BlcmF0aW5nSG91cnMgPSBzZWxmLnJlc3RhdXJhbnQub3BlcmF0aW5nX2hvdXJzKSA9PiB7XG4gIGNvbnN0IGhvdXJzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Jlc3RhdXJhbnQtaG91cnMnKTtcbiAgZm9yIChsZXQga2V5IGluIG9wZXJhdGluZ0hvdXJzKSB7XG4gICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcblxuICAgIGNvbnN0IGRheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RkJyk7XG4gICAgZGF5LmlubmVySFRNTCA9IGtleTtcbiAgICByb3cuYXBwZW5kQ2hpbGQoZGF5KTtcblxuICAgIGNvbnN0IHRpbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZCcpO1xuICAgIHRpbWUuaW5uZXJIVE1MID0gb3BlcmF0aW5nSG91cnNba2V5XTtcbiAgICByb3cuYXBwZW5kQ2hpbGQodGltZSk7XG5cbiAgICBob3Vycy5hcHBlbmRDaGlsZChyb3cpO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGFsbCByZXZpZXdzIEhUTUwgYW5kIGFkZCB0aGVtIHRvIHRoZSB3ZWJwYWdlLlxuICovXG5maWxsUmV2aWV3c0hUTUwgPSAocmVzdGF1cmFudCA9IHNlbGYucmVzdGF1cmFudCkgPT4ge1xuICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1jb250YWluZXInKSxcbiAgICAgICAgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1saXN0Jyk7XG4gIFxuICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2gzJyk7XG4gIHRpdGxlLmlubmVySFRNTCA9ICdSZXZpZXdzJztcblxuICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKHRpdGxlLCB1bCk7XG5cbiAgREJIZWxwZXIuZmV0Y2hSZXZpZXdzQnlSZXN0YXVyYW50KHJlc3RhdXJhbnQuaWQsIChlcnJvciwgcmV2aWV3cykgPT4ge1xuICAgIGlmIChlcnJvcikge1xuICAgICAgY29uc3Qgbm9SZXZpZXdzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgICAgbm9SZXZpZXdzLmlubmVySFRNTCA9ICdTb3JyeSwgdGhlcmUgd2FzIGEgcHJvYmxlbSBkb3dubG9hZGluZyB0aGUgcmV2aWV3cyc7XG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobm9SZXZpZXdzKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSBhcmUgYW55IHJldmlld3NcbiAgICBpZiAocmV2aWV3cy5sZW5ndGggPiAwKSB7XG4gICAgICB1cGRhdGVSZXZpZXdzVUkocmV2aWV3cyk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqXG4qIFVwZGF0ZSByZXZpZXdzIGluIHRoZSByZXN0YXVyYW50cyBwYWdlXG4qL1xudXBkYXRlUmV2aWV3c1VJID0gKHJldmlld3MpID0+IHtcbiAgY29uc3QgdWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmV2aWV3cy1saXN0Jyk7XG4gIFxuICByZXZpZXdzLmZvckVhY2gocmV2aWV3ID0+IHtcbiAgICBjb25zdCBpdGVtID0gY3JlYXRlUmV2aWV3SFRNTChyZXZpZXcpO1xuICAgIHVsLmFwcGVuZENoaWxkKGl0ZW0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgcmV2aWV3IEhUTUwgYW5kIGFkZCBpdCB0byB0aGUgd2VicGFnZS5cbiAqL1xuY3JlYXRlUmV2aWV3SFRNTCA9IChyZXZpZXcpID0+IHtcbiAgY29uc3QgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICBjb25zdCBuYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICBjb25zdCBoZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgY29uc3QgY29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGhlYWRlci5jbGFzc05hbWUgPSAnaGVhZGVyJztcbiAgY29udGVudC5jbGFzc05hbWUgPSAncmV2aWV3LWNvbnRlbnQnO1xuICBsaS5hcHBlbmRDaGlsZChoZWFkZXIpO1xuICBsaS5hcHBlbmRDaGlsZChjb250ZW50KTtcblxuICBuYW1lLmNsYXNzTmFtZSA9ICdyZXZpZXdlci1uYW1lJztcbiAgbmFtZS5pbm5lckhUTUwgPSByZXZpZXcubmFtZTtcbiAgaGVhZGVyLmFwcGVuZENoaWxkKG5hbWUpO1xuXG4gIGNvbnN0IGRhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gIGRhdGUuY2xhc3NOYW1lID0gJ3Jldmlldy1kYXRlJztcbiAgZGF0ZS5pbm5lckhUTUwgPSBuZXcgRGF0ZShyZXZpZXcudXBkYXRlZEF0KS50b0xvY2FsZURhdGVTdHJpbmcoXCJlbi1VU1wiKTtcbiAgaGVhZGVyLmFwcGVuZENoaWxkKGRhdGUpO1xuXG4gIGNvbnN0IHJhdGluZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgcmF0aW5nLmNsYXNzTmFtZSA9ICdyZXZpZXctcmF0aW5nJztcbiAgcmF0aW5nLmlubmVySFRNTCA9IGBSYXRpbmc6ICR7cmV2aWV3LnJhdGluZ31gO1xuICBjb250ZW50LmFwcGVuZENoaWxkKHJhdGluZyk7XG5cbiAgY29uc3QgY29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdwJyk7XG4gIGNvbW1lbnRzLmlubmVySFRNTCA9IHJldmlldy5jb21tZW50cztcbiAgY29udGVudC5hcHBlbmRDaGlsZChjb21tZW50cyk7XG5cbiAgcmV0dXJuIGxpO1xufVxuXG4vKipcbiogY3JlYXRlIHJldmlld0Zvcm1cbiovXG5jcmVhdGVSZXZpZXdGb3JtID0gKHJlc3RhdXJhbnQgPSBzZWxmLnJlc3RhdXJhbnQpID0+IHtcbiAgY29uc3QgZm9ybUNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXZpZXdzLWZvcm0nKTtcblxuICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2g0Jyk7XG4gIHRpdGxlLmlubmVySFRNTCA9IFwiQWRkIHlvdXIgcmV2aWV3XCI7XG5cbiAgZm9ybUNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aXRsZSk7XG5cbiAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvcm0nKTtcbiAgZm9ybS5zZXRBdHRyaWJ1dGUoJ21ldGhvZCcsICdodHRwOi8vbG9jYWxob3N0OjEzMzcvcmV2aWV3cy8nKTtcbiAgZm9ybS5zZXRBdHRyaWJ1dGUoJ2FjdGlvbicsICdwb3N0Jyk7XG5cbiAgY29uc3QgaGlkZGVuSWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICBoaWRkZW5JZC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3Jlc3RhdXJhbnRfaWQnKTtcbiAgaGlkZGVuSWQuc2V0QXR0cmlidXRlKCduYW1lJywgJ3Jlc3RhdXJhbnRfaWQnKTtcbiAgaGlkZGVuSWQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2hpZGRlbicpO1xuICBoaWRkZW5JZC5zZXRBdHRyaWJ1dGUoJ3ZhbHVlJywgcmVzdGF1cmFudC5pZCk7XG5cbiAgZm9ybS5hcHBlbmRDaGlsZChoaWRkZW5JZCk7XG5cbiAgY29uc3QgZGl2TmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGNvbnN0IGxhYmVsTmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG4gIGxhYmVsTmFtZS5zZXRBdHRyaWJ1dGUoJ2ZvcicsICduYW1lJyk7XG4gIGxhYmVsTmFtZS5pbm5lckhUTUwgPSAnWW91ciBOYW1lJztcbiAgZGl2TmFtZS5hcHBlbmRDaGlsZChsYWJlbE5hbWUpO1xuXG4gIGNvbnN0IGlucHV0TmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gIGlucHV0TmFtZS5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dCcpO1xuICBpbnB1dE5hbWUuc2V0QXR0cmlidXRlKCdpZCcsICduYW1lJyk7XG4gIGlucHV0TmFtZS5zZXRBdHRyaWJ1dGUoJ25hbWUnLCAnbmFtZScpO1xuICBpbnB1dE5hbWUuc2V0QXR0cmlidXRlKCdyZXF1aXJlZCcsICcnKTtcbiAgZGl2TmFtZS5hcHBlbmRDaGlsZChpbnB1dE5hbWUpO1xuXG4gIGZvcm0uYXBwZW5kQ2hpbGQoZGl2TmFtZSk7XG5cbiAgY29uc3QgZGl2UmF0aW5nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgY29uc3QgbGFiZWxSYXRpbmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsYWJlbCcpO1xuICBsYWJlbFJhdGluZy5zZXRBdHRyaWJ1dGUoJ2ZvcicsICdyYXRpbmcnKTtcbiAgbGFiZWxSYXRpbmcuaW5uZXJIVE1MID0gJ1JhdGluZyc7XG4gIGRpdlJhdGluZy5hcHBlbmRDaGlsZChsYWJlbFJhdGluZyk7XG5cbiAgY29uc3QgaW5wdXRSYXRpbmcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICBpbnB1dFJhdGluZy5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAnbnVtYmVyJyk7XG4gIGlucHV0UmF0aW5nLnNldEF0dHJpYnV0ZSgnaWQnLCAncmF0aW5nJyk7XG4gIGlucHV0UmF0aW5nLnNldEF0dHJpYnV0ZSgnbmFtZScsICdyYXRpbmcnKTtcbiAgaW5wdXRSYXRpbmcuc2V0QXR0cmlidXRlKCdzdGVwJywgMSk7XG4gIGlucHV0UmF0aW5nLnNldEF0dHJpYnV0ZSgnbWluJywgMSk7XG4gIGlucHV0UmF0aW5nLnNldEF0dHJpYnV0ZSgnbWF4JywgNSk7XG4gIGRpdlJhdGluZy5hcHBlbmRDaGlsZChpbnB1dFJhdGluZyk7XG5cbiAgZm9ybS5hcHBlbmRDaGlsZChkaXZSYXRpbmcpO1xuXG4gIGNvbnN0IGRpdkNvbW1lbnRzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgY29uc3QgbGFiZWxDb21tZW50cyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xhYmVsJyk7XG4gIGxhYmVsQ29tbWVudHMuc2V0QXR0cmlidXRlKCdmb3InLCAnY29tbWVudHMnKTtcbiAgbGFiZWxDb21tZW50cy5pbm5lckhUTUwgPSAnWW91ciBjb21tZW50cyc7XG4gIGRpdkNvbW1lbnRzLmFwcGVuZENoaWxkKGxhYmVsQ29tbWVudHMpO1xuXG4gIGNvbnN0IGlucHV0Q29tbWVudHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICBpbnB1dENvbW1lbnRzLnNldEF0dHJpYnV0ZSgnaWQnLCAnY29tbWVudHMnKTtcbiAgaW5wdXRDb21tZW50cy5zZXRBdHRyaWJ1dGUoJ25hbWUnLCAnY29tbWVudHMnKTtcblxuICBkaXZDb21tZW50cy5hcHBlbmRDaGlsZChpbnB1dENvbW1lbnRzKTtcbiAgZm9ybS5hcHBlbmRDaGlsZChkaXZDb21tZW50cyk7XG5cbiAgY29uc3QgZGl2QnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgY29uc3Qgc3VibWl0QnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gIHN1Ym1pdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAnc3VibWl0Jyk7XG4gIHN1Ym1pdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3N1Ym1pdCcpO1xuICBzdWJtaXRCdXR0b24uc2V0QXR0cmlidXRlKCdjbGFzcycsICdidXR0b24nKTtcbiAgc3VibWl0QnV0dG9uLnNldEF0dHJpYnV0ZSgncm9sZScsICdidXR0b24nKTtcbiAgc3VibWl0QnV0dG9uLmlubmVySFRNTCA9ICdTdWJtaXQgeW91ciByZXZpZXcnO1xuXG4gIGZvcm0uYXBwZW5kQ2hpbGQoc3VibWl0QnV0dG9uKTtcblxuICBmb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIGFkZEFuZFBvc3RSZXZpZXcpO1xuXG4gIGZvcm1Db250YWluZXIuYXBwZW5kQ2hpbGQoZm9ybSk7XG59XG5cbnBvc3RSZXZpZXcgPSAocmV2aWV3KSA9PiB7XG4gIGRlbGV0ZSByZXZpZXcuaXNfcGVuZGluZztcblxuICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMoeydBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCd9KTtcbiAgY29uc3QgYm9keSA9IEpTT04uc3RyaW5naWZ5KHJldmlldyk7XG5cbiAgZmV0Y2goJ2h0dHA6Ly9sb2NhbGhvc3Q6MTMzNy9yZXZpZXdzLycsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBtb2RlOiAnY29ycycsXG4gICAgaGVhZGVyczogaGVhZGVycyxcbiAgICBib2R5OiBib2R5XG4gIH0pLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgIC8vIElmIHRoZSByZXNwb25zZSBpcyBvaywgcmVtb3ZlIHRoZSBpc19wZW5kaW5nIGZsYWcgYW5kIHVwZGF0ZSB0aGUgcmVjb3JkIGluIHRoZSBkYXRhYmFzZVxuICAgIGlmICgocmVzcG9uc2Uuc3RhdHVzID09IDIwMCkgfHwgKHJlc3BvbnNlLnN0YXR1cyA9PSAyMDEpKSB7XG4gICAgICBEQkhlbHBlci5vcGVuREIoKS50aGVuKGRiID0+IHtcbiAgICAgICAgY29uc3QgdHggPSBkYi50cmFuc2FjdGlvbigncmV2aWV3cycsICdyZWFkd3JpdGUnKTtcbiAgICAgICAgY29uc3Qgc3RvcmUgPSB0eC5vYmplY3RTdG9yZSgncmV2aWV3cycpO1xuICAgICAgICByZXR1cm4gc3RvcmUucHV0KHJldmlldyk7XG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Jlc3BvbnNlIHN0YXR1cyBpcyBub3QgMjAwIG9yIDIwMScpXG4gICAgfVxuICB9KS5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coJ0NvdWxkIG5vdCBwb3N0IHRoZSByZXZpZXc6ICcgKyBlcnIpKTtcbn1cblxuXG5hZGRBbmRQb3N0UmV2aWV3ID0gKGV2ZW50KSA9PiB7XG4gIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgY29uc3QgdXJsID0gbmV3IFVSTCh3aW5kb3cubG9jYXRpb24pLFxuICAgICAgICByZXN0YXVyYW50X2lkX3VybCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdpZCcpO1xuXG4gIGNvbnN0IGRhdGEgPSB7XG4gICAgcmVzdGF1cmFudF9pZDogcGFyc2VJbnQocmVzdGF1cmFudF9pZF91cmwsIDEwKSxcbiAgICBuYW1lOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmFtZScpLnZhbHVlLFxuICAgIHJhdGluZzogcGFyc2VJbnQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JhdGluZycpLnZhbHVlLCAxMCksXG4gICAgY29tbWVudHM6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb21tZW50cycpLnZhbHVlLFxuICAgIGlzX3BlbmRpbmc6IHRydWVcbiAgfVxuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduYW1lJykudmFsdWUgPSAnJztcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JhdGluZycpLnZhbHVlID0gJyc7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb21tZW50cycpLnZhbHVlID0gJyc7XG5cbiAgLy8gYXBwZW5kIHRoZSByZXZpZXcgdG8gdGhlIGxpc3RcbiAgdXBkYXRlUmV2aWV3c1VJKFtkYXRhXSk7XG5cbiAgLy8gc2F2ZSB0aGUgcmV2aWV3IGluIHRoZSBsb2NhbCBkYXRhYmFzZVxuICBEQkhlbHBlci5zYXZlUmV2aWV3c0xvY2FsbHkoW2RhdGFdKVxuICAgIC50aGVuKHJlc3BvbnNlID0+IGNvbnNvbGUubG9nKCdSZXZpZXcgc2F2ZWQgbG9jYWxseScpKVxuICAgIC5jYXRjaChlcnIgPT4gY29uc29sZS5sb2coJ0NvdWxkIG5vdCBzYXZlIHJldmlld3MgbG9jYWxseScgKyBlcnIpKTtcblxuICBpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvciAmJiAnU3luY01hbmFnZXInIGluIHdpbmRvdykge1xuICAgIGNvbnNvbGUubG9nKCdzZXJ2aWNlIHdvcmtlciBpbiBuYXZpZ2F0b3IgZXRjLicpO1xuICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlYWR5XG4gICAgICAudGhlbihyZWcgPT4ge1xuICAgICAgICByZWcuc3luYy5yZWdpc3Rlcignc3VibWl0UmV2aWV3cycpO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICAvLyBzeXN0ZW0gd2FzIHVuYWJsZSB0byByZWdpc3RlciBmb3IgYSBzeW5jLCBzZW5kIG5vcm1hbFxuICAgICAgICBwb3N0UmV2aWV3KGRhdGEpO1xuICAgICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gaWYgdGhlcmUgaXMgbm8gc2VydmljZSB3b3JrZXJcbiAgICBwb3N0UmV2aWV3KGRhdGEpO1xuICB9XG59XG5cbi8qKlxuICogQWRkIHJlc3RhdXJhbnQgbmFtZSB0byB0aGUgYnJlYWRjcnVtYiBuYXZpZ2F0aW9uIG1lbnVcbiAqL1xuZmlsbEJyZWFkY3J1bWIgPSAocmVzdGF1cmFudD1zZWxmLnJlc3RhdXJhbnQpID0+IHtcbiAgY29uc3QgYnJlYWRjcnVtYiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdicmVhZGNydW1iJyk7XG4gIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgY29uc3Qgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgc3Bhbi5zZXRBdHRyaWJ1dGUoJ2FyaWEtY3VycmVudCcsICdwYWdlJyk7XG4gIGxpLmFwcGVuZENoaWxkKHNwYW4pO1xuICBzcGFuLmlubmVySFRNTCA9IHJlc3RhdXJhbnQubmFtZTtcbiAgYnJlYWRjcnVtYi5hcHBlbmRDaGlsZChsaSk7XG59XG5cbi8qKlxuICogR2V0IGEgcGFyYW1ldGVyIGJ5IG5hbWUgZnJvbSBwYWdlIFVSTC5cbiAqL1xuZ2V0UGFyYW1ldGVyQnlOYW1lID0gKG5hbWUsIHVybCkgPT4ge1xuICBpZiAoIXVybClcbiAgICB1cmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZjtcbiAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW1xcXV0vZywgJ1xcXFwkJicpO1xuICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoYFs/Jl0ke25hbWV9KD0oW14mI10qKXwmfCN8JClgKSxcbiAgICByZXN1bHRzID0gcmVnZXguZXhlYyh1cmwpO1xuICBpZiAoIXJlc3VsdHMpXG4gICAgcmV0dXJuIG51bGw7XG4gIGlmICghcmVzdWx0c1syXSlcbiAgICByZXR1cm4gJyc7XG4gIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1syXS5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XG59XG4iXSwiZmlsZSI6InJlc3RhdXJhbnRfaW5mby1taW4uanMifQ==
