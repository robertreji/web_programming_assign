

document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const moviesGrid = document.getElementById('movies-grid');
  const noMoviesFound = document.getElementById('no-movies-found');
  const loadingState = document.getElementById('loading-state');
  const fetchError = document.getElementById('fetch-error');
  const fetchErrorMsg = document.getElementById('fetch-error-msg');
  const retryFetchBtn = document.getElementById('retry-fetch-btn');
  const searchInput = document.getElementById('movie-search-input');
  const clearSearchBtn = document.getElementById('search-clear-btn');
  const filterChips = document.querySelectorAll('.filter-chip');
  const resultCounter = document.getElementById('result-counter');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

  const cardTemplateEl = document.getElementById('movie-card-template');
  const cardTemplate = cardTemplateEl ? cardTemplateEl.innerHTML : '';

  let allMovies = [];
  let currentFilter = 'All';
  let searchQuery = '';

  /**
   * Toggle the loading UI state
   * @param {boolean} isLoading
   */
  function setLoadingState(isLoading) {
    if (isLoading) {
      loadingState.classList.remove('hidden');
      fetchError.classList.add('hidden');
      moviesGrid.classList.add('hidden');
      noMoviesFound.classList.add('hidden');
      resultCounter.textContent = 'Connecting to service...';
    } else {
      loadingState.classList.add('hidden');
    }
  }

  /**
   * Display the failed fetch request error UI state
   * @param {string} message
   */
  function setErrorState(message) {
    loadingState.classList.add('hidden');
    moviesGrid.classList.add('hidden');
    noMoviesFound.classList.add('hidden');
    fetchError.classList.remove('hidden');
    fetchErrorMsg.textContent = message || 'Could not communicate with the server endpoint.';
    resultCounter.textContent = 'Service unavailable';
  }

  /**
   * Render movie list using Mustache.js if available, falling back to Vanilla DOM
   * @param {Array} movieStore
   */
  function renderMovies(movieStore) {
    moviesGrid.innerHTML = '';

    if (!movieStore || movieStore.length === 0) {
      moviesGrid.classList.add('hidden');
      noMoviesFound.classList.remove('hidden');
      resultCounter.textContent = 'Showing 0 movies';
      return;
    }

    noMoviesFound.classList.add('hidden');
    moviesGrid.classList.remove('hidden');
    resultCounter.textContent = `Showing ${movieStore.length} ${movieStore.length === 1 ? 'movie' : 'movies'}`;

    if (typeof Mustache !== 'undefined' && cardTemplate) {
      const renderedCards = movieStore.map(movie => {
        const genreString = Array.isArray(movie.genre) 
          ? movie.genre.join(' • ') 
          : (movie.category || '');
        const fallbackUrl = 'https://via.placeholder.com/400x600/1f2937/9ca3af?text=' + encodeURIComponent(movie.title);
        const posterUrl = movie.poster || movie.webPoster || fallbackUrl;

        return Mustache.render(cardTemplate, {
          id: movie.id,
          title: movie.title,
          category: movie.category,
          language: movie.language,
          genreString: genreString,
          rating: movie.rating,
          year: movie.year,
          duration: movie.duration || '',
          posterUrl: posterUrl,
          fallbackUrl: movie.webPoster || fallbackUrl
        });
      }).join('');

      moviesGrid.innerHTML = renderedCards;
      return;
    }

    const fragment = document.createDocumentFragment();

    movieStore.forEach(movie => {
      const card = document.createElement('article');
      card.className = 'movie-card';
      card.setAttribute('data-id', movie.id);
      card.setAttribute('tabindex', '0');

      const genreString = Array.isArray(movie.genre) 
        ? movie.genre.join(' • ') 
        : (movie.category || '');

      card.innerHTML = `
        <div class="poster-wrapper">
          <img 
            src="${movie.poster || movie.webPoster}" 
            alt="${movie.title} Poster" 
            class="movie-poster"
            loading="lazy" 
            onerror="this.onerror=null; this.src='${movie.webPoster || 'https://via.placeholder.com/400x600/1f2937/9ca3af?text=' + encodeURIComponent(movie.title)}';"
          />
          <span class="badge-rating" aria-label="Rating ${movie.rating} out of 10">⭐ ${movie.rating}</span>
          <span class="badge-language">${movie.language}</span>
        </div>
        <div class="card-info">
          <h3 class="movie-title">${movie.title}</h3>
          <p class="genre-tags">${genreString}</p>
          <div class="card-footer-meta">
            <span class="movie-year">${movie.year}</span>
            <span class="movie-duration">${movie.duration || ''}</span>
          </div>
        </div>
      `;

      fragment.appendChild(card);
    });

    moviesGrid.appendChild(fragment);
  }


  function applyFilterAndSearch() {
    const query = searchQuery.trim().toLowerCase();

    const filteredMovies = allMovies.filter(movie => {
      let matchesFilter = false;
      if (currentFilter === 'All') {
        matchesFilter = true;
      } else {
        const catMatch = movie.category && movie.category.toLowerCase() === currentFilter.toLowerCase();
        const langMatch = movie.language && movie.language.toLowerCase() === currentFilter.toLowerCase();
        const genreMatch = Array.isArray(movie.genre) && movie.genre.some(g => g.toLowerCase() === currentFilter.toLowerCase());
        matchesFilter = catMatch || langMatch || genreMatch;
      }

      let matchesSearch = true;
      if (query !== '') {
        const titleMatch = movie.title && movie.title.toLowerCase().includes(query);
        const catMatch = movie.category && movie.category.toLowerCase().includes(query);
        const langMatch = movie.language && movie.language.toLowerCase().includes(query);
        const genreMatch = Array.isArray(movie.genre) && movie.genre.some(g => g.toLowerCase() === query);
        const yearMatch = movie.year && movie.year.toString().includes(query);
        
        matchesSearch = titleMatch || catMatch || langMatch || genreMatch || yearMatch;
      }

      return matchesFilter && matchesSearch;
    });

    renderMovies(filteredMovies);
  }

  /**
   * Asynchronously fetch movie data from PHP REST endpoint via Fetch API
   * @param {string} endpointUrl 
   */
  async function fetchMovies(endpointUrl = 'api.php') {
    setLoadingState(true);

    try {
      const response = await fetch(endpointUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        let errMessage = `Server returned HTTP status ${response.status} (${response.statusText})`;
        try {
          const errBody = await response.json();
          if (errBody && errBody.message) {
            errMessage = errBody.message;
          }
        } catch (_) {
          // If body is not JSON, retain HTTP status message
        }
        throw new Error(errMessage);
      }

      const payload = await response.json();

      if (!payload || !Array.isArray(payload.graph)) {
        throw new Error('Received unexpected data format: missing "graph" array.');
      }

      allMovies = payload.graph;
      setLoadingState(false);
      applyFilterAndSearch();
    } catch (err) {
      console.error('Fetch operation failed:', err);
      setErrorState(err.message || 'Failed to connect to the PHP data endpoint.');
    }
  }

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    applyFilterAndSearch();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    applyFilterAndSearch();
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      currentFilter = chip.getAttribute('data-filter');
      applyFilterAndSearch();
    });
  });

  resetFiltersBtn.addEventListener('click', () => {
    currentFilter = 'All';
    searchQuery = '';
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');

    filterChips.forEach(c => {
      if (c.getAttribute('data-filter') === 'All') {
        c.classList.add('active');
        c.setAttribute('aria-selected', 'true');
      } else {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      }
    });

    applyFilterAndSearch();
  });

  retryFetchBtn.addEventListener('click', () => {
    fetchMovies();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.add('hidden');
      searchInput.blur();
      applyFilterAndSearch();
    }
  });

  fetchMovies();
});
