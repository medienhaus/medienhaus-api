(function() {

	// Function to generate random number 
	function randomNumber(min, max) { 
		return Math.floor(Math.random() * (max - min) + min);
	} 
	  
	  
	// only for preview: get different heights of tiles
	/*
	const images = document.querySelectorAll(".image");
	images.forEach(function(image) {
		var randomHeight = randomNumber(150, 400);
		image.setAttribute("style","height:"+randomHeight+"px;");
	});
	*/
	
	const firstLevel = document.querySelector('.level.first');
	const firstLevelElms = firstLevel.querySelectorAll('ul li');
	const secondLevel = document.querySelector('.level.second')
	const secondLevelLists = secondLevel.querySelectorAll('ul');
	const backButton = document.querySelectorAll('.level.second .back')
	const selected = document.querySelector('.selected');
	const projectsContainer = document.querySelector('.projectswrap');
	
	function activeFirstLevel() {
		firstLevel.classList.add('active');
	}
	
	function hideFirstLevel() {
		firstLevel.classList.remove('active');
	}
	
	function showSecondLevel() {
		secondLevel.classList.add('active');
	}
	
	function hideSecondLevel() {
		secondLevel.classList.remove('active');
	}
	
	function firstLevelItemsClickHandler() {
		const id = this.getAttribute('data-id');
		const targetElm = document.querySelector(`#${id}`);
		if (targetElm) {
			hideFirstLevel();
			secondLevelLists.forEach( function(el) {
				el.classList.remove('active')
			});
			targetElm.classList.add('active');
			showSecondLevel();
		} else if ( id == 'all' ) {
			// remove all selected filters and refresh slides
			document.querySelector('.selected').innerHTML = '';
			filterSlides();
		}
	}
	
	firstLevelElms.forEach((firstLevelElm, index) => {
		firstLevelElm.addEventListener('click', firstLevelItemsClickHandler);
	})
	
	backButton.forEach((el, index) => {
		el.addEventListener('click', function() {
			hideSecondLevel();
			activeFirstLevel();
		});
	});
	
	function removeFilterClickHandler() {
		const parent = this.parentElement;
		const text = parent.innerText.slice(0, -1); // remove X too form text
		const id = parent.getAttribute('data-parent-id');
	
		document.querySelectorAll(`#${id} li.hide`).forEach((li) => {
			if (li.innerText === text) {
				li.classList.remove('hide');
				parent.remove();
			}
		});
	
		// after removing refresh slides
		filterSlides();
	}
	
	function filtersClickHandler() {
	
		const div = document.createElement('div');
		div.innerText = this.innerText;
		div.setAttribute('data-parent-id', this.parentElement.getAttribute('id'));
		div.setAttribute('data-filter', this.getAttribute('data-toggle'));
		div.setAttribute('data-ref', 'filter');
		div.classList.add('control');

		const span = document.createElement('span');
		span.innerText = '×';
		span.classList.add('close-selected');
		span.addEventListener('click', removeFilterClickHandler);
	
		div.appendChild(span);
	
		// add it to selected 
		selected.appendChild(div);
	
		this.classList.add('hide');
		// after adding refresh slides
		filterSlides();
	}
	
	secondLevelLists.forEach((list, index) => {
		const liItems = list.querySelectorAll('li:not(.back)');
		liItems.forEach((liItem) => {
			liItem.addEventListener('click', filtersClickHandler);
		});
	});

	var container = document.querySelector('.projectswrap');
	var mixer = mixitup(container, {
		selectors: {
			target: '[data-ref="item"]'
		},
		animation: {
			queueLimit: 10,
		}
	});

	function filterSlides() {
		// If button is already active, or an operation is in progress, ignore the click
		// if (mixer.isMixing()) return;

		const selectedControls = document.querySelectorAll('.controls .control');

		let selectors = [];
		const orSelectors = [];
		const queryStrings = {};

		selectedControls.forEach((selectedControl) => {
			const parent = selectedControl.getAttribute('data-parent-id')
			
			queryStrings[parent] = [];

			const parents = document.querySelectorAll(`[data-parent-id=${parent}]`);
			// it means there multiple toplevel selected
			if (parents.length > 1) {
				parents.forEach((p) => {
					const filter = p.getAttribute('data-filter');
					queryStrings[parent].push(filter);

					if ( orSelectors.indexOf(`[data-${parent}="${filter}"]`) === -1 ) {
						orSelectors.push(`[data-${parent}="${filter}"]`);
					}
				});
			} else {
				const filter = selectedControl.getAttribute('data-filter');
				selectors.push(`[data-${parent}="${filter}"]`);
				queryStrings[parent].push(filter);
			}
		});

		if ( event.isTrusted ) {
			let url = []; 
			for(let queryString in queryStrings) { 
				url.push(`${queryString}=${queryStrings[queryString].join(',')}`)  
			}

			const newQueryString = url.length ? '?' + url.join('&') : '';
			let newURL = '';

			if ( window.location.href.match(/\?/) ) {
				newURL = window.location.href.replace(/\?[\w=,&#]*/, newQueryString);
			} else {
				newURL = window.location.href += newQueryString;
			}
			window.history.pushState({page: "filterpage"}, "filter page", newURL);
		}

		if (orSelectors.length && selectors.length) {
			// merge all or selectors with and selectors
			const newSelectors = [];
			for(let orSelector of orSelectors) {
				newSelectors.push(orSelector + selectors.join(''));
			}
			
			selectors = [newSelectors.join(', ')];
			
		} else {
			selectors = orSelectors.length ? [orSelectors.join(', ')] : selectors;
		}

		if (selectors.length) {
			mixer.filter(selectors.join(''));
		} else {
			mixer.filter('all');
		}

	}

	// check filters by url
	const searchParams = [];
	document.querySelectorAll('.level.first ul li').forEach((elm) => {
		const filterId = elm.getAttribute('data-id');
		if (filterId !== 'all') {
			searchParams.push(filterId);
		}
	});

	function filterByURL() {
		const search = new URLSearchParams(window.location.search);
		let searchParamFound = false;
		document.querySelector('.selected.controls').innerHTML = '';
		searchParams.forEach((parentValue, i) => {
			if (search.has(parentValue)) {
				searchParamFound = true;
				const values = search.get(parentValue).split(',');
				values.forEach((childValue, index) => {
					document.querySelector(`#${parentValue} [data-toggle="${childValue}"]`).click();
				})
			}
		});
	}

	filterByURL();
	// show filters slides
	projectsContainer.style.display = 'grid';

	window.addEventListener('popstate', function (event) {
		filterByURL();
    });

})();
