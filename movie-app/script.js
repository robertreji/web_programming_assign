
document.addEventListener('DOMContentLoaded', () => {

  const moviesGrid = document.getElementById('movies-grid');
  const noMoviesFound = document.getElementById('no-movies-found');
  const searchInput = document.getElementById('movie-search-input');
  const clearSearchBtn = document.getElementById('search-clear-btn');
  const filterChips = document.querySelectorAll('.filter-chip');
  const resultCounter = document.getElementById('result-counter');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');

  let currentFilter = 'All';
  let searchQuery = '';

  const movies = (typeof movieData !== 'undefined' && Array.isArray(movieData.graph)) 
    ? movieData.graph 
    : [];


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

    const filteredMovies = movies.filter(movie => {
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
        const genreMatch = Array.isArray(movie.genre) && movie.genre.some(g => g.toLowerCase().includes(query));
        const yearMatch = movie.year && movie.year.toString().includes(query);
        
        matchesSearch = titleMatch || catMatch || langMatch || genreMatch || yearMatch;
      }

      return matchesFilter && matchesSearch;
    });

    renderMovies(filteredMovies);
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

  renderMovies(movies);
});
