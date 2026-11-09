document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const moviesGrid = $('movies-grid');
  const noMoviesFound = $('no-movies-found');
  const loadingState = $('loading-state');
  const fetchError = $('fetch-error');
  const resultCounter = $('result-counter');
  const searchInput = $('movie-search-input');
  const clearSearchBtn = $('search-clear-btn');
  const cardTemplate = $('movie-card-template').innerHTML;
  const editorPanel = $('editor-panel');
  const movieForm = $('movie-form');
  const loginModal = $('login-modal');
  const apiBase = 'api.php';
  let currentFilter = 'All';
  let currentQuery = '';
  let movies = [];

  function showMessage(element, message, error = true) {
    element.textContent = message;
    element.classList.toggle('error-message', error);
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || `Request failed (${response.status}).`);
    return payload;
  }

  function apiUrl(route, parameters = {}) {
    const params = new URLSearchParams({ route, ...parameters });
    return `${apiBase}?${params}`;
  }

  function renderMovies(items) {
    moviesGrid.innerHTML = items.map(movie => Mustache.render(cardTemplate, {
      ...movie,
      genreString: movie.genre.join(' • '),
      posterUrl: movie.poster || 'https://via.placeholder.com/400x600/1f2937/9ca3af?text=' + encodeURIComponent(movie.title),
      fallbackUrl: movie.webPoster || ''
    })).join('');
    moviesGrid.classList.toggle('hidden', items.length === 0);
    noMoviesFound.classList.toggle('hidden', items.length !== 0);
    resultCounter.textContent = `Showing ${items.length} ${items.length === 1 ? 'movie' : 'movies'}`;
  }

  async function loadMovies() {
    loadingState.classList.remove('hidden');
    fetchError.classList.add('hidden');
    try {
      const parameters = {};
      if (currentQuery) parameters.q = currentQuery;
      if (currentFilter !== 'All') parameters.category = currentFilter;
      const payload = await request(apiUrl('items', parameters));
      movies = payload.items || [];
      renderMovies(movies);
    } catch (error) {
      moviesGrid.classList.add('hidden');
      noMoviesFound.classList.add('hidden');
      fetchError.classList.remove('hidden');
      $('fetch-error-msg').textContent = error.message;
      resultCounter.textContent = 'Service unavailable';
    } finally {
      loadingState.classList.add('hidden');
    }
  }

  function resetForm() {
    movieForm.reset();
    $('movie-id').value = '';
    $('editor-title').textContent = 'Add movie';
    showMessage($('form-message'), '');
  }

  function openEditor(movie = null) {
    editorPanel.classList.remove('hidden');
    resetForm();
    if (movie) {
      $('editor-title').textContent = 'Edit movie';
      $('movie-id').value = movie.id;
      $('movie-title').value = movie.title;
      $('movie-category').value = movie.category;
      $('movie-language').value = movie.language;
      $('movie-genres').value = movie.genre.join(', ');
      $('movie-rating').value = movie.rating;
      $('movie-year').value = movie.year;
      $('movie-poster').value = movie.poster || '';
      $('movie-duration').value = movie.duration || '';
      $('movie-description').value = movie.description || '';
    }
    editorPanel.scrollIntoView({ behavior: 'smooth' });
  }

  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await request(apiUrl('login'), {
        method: 'POST',
        body: JSON.stringify({ username: $('login-username').value, password: $('login-password').value })
      });
      loginModal.classList.add('hidden');
      $('login-btn').classList.add('hidden');
      $('logout-btn').classList.remove('hidden');
      $('add-movie-btn').classList.remove('hidden');
    } catch (error) {
      showMessage($('login-message'), error.message);
    }
  });

  movieForm.addEventListener('submit', async event => {
    event.preventDefault();
    const id = $('movie-id').value;
    const body = {
      title: $('movie-title').value,
      category: $('movie-category').value,
      language: $('movie-language').value,
      genres: $('movie-genres').value.split(',').map(value => value.trim()).filter(Boolean),
      rating: Number($('movie-rating').value),
      year: Number($('movie-year').value),
      poster_url: $('movie-poster').value,
      duration: $('movie-duration').value,
      description: $('movie-description').value
    };
    try {
      await request(apiUrl(id ? `items/${id}` : 'items'), {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      editorPanel.classList.add('hidden');
      await loadMovies();
    } catch (error) {
      showMessage($('form-message'), error.message);
    }
  });

  $('movies-grid').addEventListener('click', event => {
    const card = event.target.closest('.movie-card');
    if (card && !$('login-btn').classList.contains('hidden')) return;
    if (card) openEditor(movies.find(movie => String(movie.id) === card.dataset.id));
  });
  $('login-btn').addEventListener('click', () => loginModal.classList.remove('hidden'));
  $('close-login-btn').addEventListener('click', () => loginModal.classList.add('hidden'));
  $('logout-btn').addEventListener('click', async () => {
    await request(apiUrl('logout'), { method: 'POST' });
    $('logout-btn').classList.add('hidden');
    $('login-btn').classList.remove('hidden');
    $('add-movie-btn').classList.add('hidden');
    editorPanel.classList.add('hidden');
  });
  $('add-movie-btn').addEventListener('click', () => openEditor());
  $('cancel-edit-btn').addEventListener('click', () => editorPanel.classList.add('hidden'));
  $('retry-fetch-btn').addEventListener('click', loadMovies);
  $('reset-filters-btn').addEventListener('click', () => {
    currentFilter = 'All';
    currentQuery = '';
    searchInput.value = '';
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.filter === 'All'));
    loadMovies();
  });
  searchInput.addEventListener('input', () => {
    currentQuery = searchInput.value.trim();
    clearSearchBtn.classList.toggle('hidden', !currentQuery);
    clearTimeout(searchInput.searchTimer);
    searchInput.searchTimer = setTimeout(loadMovies, 250);
  });
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentQuery = '';
    clearSearchBtn.classList.add('hidden');
    loadMovies();
  });
  document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
    currentFilter = chip.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach(item => item.classList.toggle('active', item === chip));
    loadMovies();
  }));
  loadMovies();
});
