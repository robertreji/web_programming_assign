<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
session_start();

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(array $body, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestBody(): array
{
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) {
        respond(['status' => 'error', 'message' => 'Request body must be valid JSON.'], 400);
    }
    return $body;
}

function requireLogin(): void
{
    if (empty($_SESSION['authenticated'])) {
        respond(['status' => 'error', 'message' => 'Authentication required.'], 401);
    }
}

function validateMovie(array $input): array
{
    $title = trim((string)($input['title'] ?? ''));
    $category = trim((string)($input['category'] ?? ''));
    $language = trim((string)($input['language'] ?? ''));
    $genres = $input['genres'] ?? [];
    $rating = $input['rating'] ?? null;
    $year = $input['year'] ?? null;

    if ($title === '' || $category === '' || $language === '' || !is_array($genres)
        || count($genres) === 0 || !is_numeric($rating) || !is_numeric($year)
        || (float)$rating < 0 || (float)$rating > 10
        || (int)$year < 1900 || (int)$year > 2100) {
        respond(['status' => 'error', 'message' => 'Invalid movie data. Title, category, language, genres, rating and year are required.'], 400);
    }

    $cleanGenres = array_values(array_filter(array_map(
        static fn($genre): string => trim((string)$genre),
        $genres
    )));
    if (!$cleanGenres) {
        respond(['status' => 'error', 'message' => 'At least one genre is required.'], 400);
    }

    return [
        'title' => $title,
        'category' => $category,
        'language' => $language,
        'genres' => array_unique($cleanGenres),
        'rating' => round((float)$rating, 1),
        'year' => (int)$year,
        'poster_url' => trim((string)($input['poster_url'] ?? '')) ?: null,
        'duration' => trim((string)($input['duration'] ?? '')) ?: null,
        'description' => trim((string)($input['description'] ?? '')) ?: null,
    ];
}

function movieFromRow(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'title' => $row['title'],
        'category' => $row['category'],
        'language' => $row['language'],
        'genre' => $row['genres'] ? explode('|', $row['genres']) : [],
        'rating' => (float)$row['rating'],
        'year' => (int)$row['release_year'],
        'poster' => $row['poster_url'],
        'webPoster' => $row['poster_url'],
        'duration' => $row['duration'],
        'description' => $row['description'],
    ];
}

function findMovies(PDO $database, ?string $query, ?string $category, ?int $id = null): array
{
    $sql = 'SELECT m.*, GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR "|") AS genres
            FROM movies m
            LEFT JOIN movie_genres mg ON mg.movie_id = m.id
            LEFT JOIN genres g ON g.id = mg.genre_id
            WHERE 1=1';
    $parameters = [];
    if ($id !== null) {
        $sql .= ' AND m.id = :id';
        $parameters['id'] = $id;
    }
    if ($query !== null && $query !== '') {
        $sql .= ' AND (m.title LIKE :query OR m.category LIKE :query OR m.language LIKE :query
                  OR m.description LIKE :query OR g.name LIKE :query)';
        $parameters['query'] = '%' . $query . '%';
    }
    if ($category !== null && strtolower($category) !== 'all') {
        $sql .= ' AND (m.category = :category OR m.language = :category OR g.name = :category)';
        $parameters['category'] = $category;
    }
    $sql .= ' GROUP BY m.id ORDER BY m.id DESC';
    $statement = $database->prepare($sql);
    $statement->execute($parameters);
    return array_map('movieFromRow', $statement->fetchAll());
}

function saveGenres(PDO $database, int $movieId, array $genres): void
{
    $genreStatement = $database->prepare('INSERT INTO genres (name) VALUES (:name)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)');
    $linkStatement = $database->prepare('INSERT IGNORE INTO movie_genres (movie_id, genre_id)
        VALUES (:movie_id, :genre_id)');
    foreach ($genres as $genre) {
        $genreStatement->execute(['name' => $genre]);
        $genreId = (int)$database->lastInsertId();
        $linkStatement->execute(['movie_id' => $movieId, 'genre_id' => $genreId]);
    }
}

try {
    $database = getDatabase();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '', '/');
    $parts = explode('/', $path);
    $resource = end($parts);

    if ($method === 'OPTIONS') {
        respond(['status' => 'ok']);
    }

    if ($resource === 'login' && $method === 'POST') {
        $input = requestBody();
        $username = (string)($input['username'] ?? '');
        $password = (string)($input['password'] ?? '');
        if (!hash_equals(AUTH_USERNAME, $username) || !hash_equals(AUTH_PASSWORD, $password)) {
            respond(['status' => 'error', 'message' => 'Invalid username or password.'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['authenticated'] = true;
        $_SESSION['username'] = $username;
        respond(['status' => 'success', 'message' => 'Login successful.', 'username' => $username]);
    }

    if ($resource === 'logout' && $method === 'POST') {
        $_SESSION = [];
        session_destroy();
        respond(['status' => 'success', 'message' => 'Logged out.']);
    }

    if ($resource === 'items' && $method === 'GET') {
        $id = isset($_GET['id']) && ctype_digit((string)$_GET['id']) ? (int)$_GET['id'] : null;
        $movies = findMovies($database, trim((string)($_GET['q'] ?? '')), trim((string)($_GET['category'] ?? '')), $id);
        if ($id !== null && !$movies) {
            respond(['status' => 'error', 'message' => 'Movie not found.'], 404);
        }
        respond(['status' => 'success', 'items' => $movies]);
    }

    if ($resource === 'items' && $method === 'POST') {
        requireLogin();
        $movie = validateMovie(requestBody());
        $database->beginTransaction();
        $statement = $database->prepare('INSERT INTO movies
            (title, category, language, rating, release_year, poster_url, duration, description)
            VALUES (:title, :category, :language, :rating, :year, :poster_url, :duration, :description)');
        $statement->execute($movie);
        $movieId = (int)$database->lastInsertId();
        saveGenres($database, $movieId, $movie['genres']);
        $database->commit();
        respond(['status' => 'success', 'message' => 'Movie created.', 'item' => findMovies($database, null, null, $movieId)[0]], 201);
    }

    if ($method === 'PUT' && $parts[count($parts) - 2] === 'items' && ctype_digit((string)$resource)) {
        requireLogin();
        $movieId = (int)$resource;
        if (!findMovies($database, null, null, $movieId)) {
            respond(['status' => 'error', 'message' => 'Movie not found.'], 404);
        }
        $movie = validateMovie(requestBody());
        $database->beginTransaction();
        $statement = $database->prepare('UPDATE movies SET title=:title, category=:category,
            language=:language, rating=:rating, release_year=:year, poster_url=:poster_url,
            duration=:duration, description=:description WHERE id=:id');
        $statement->execute($movie + ['id' => $movieId]);
        $database->prepare('DELETE FROM movie_genres WHERE movie_id = :id')->execute(['id' => $movieId]);
        saveGenres($database, $movieId, $movie['genres']);
        $database->commit();
        respond(['status' => 'success', 'message' => 'Movie updated.', 'item' => findMovies($database, null, null, $movieId)[0]]);
    }

    respond(['status' => 'error', 'message' => 'Endpoint not found.'], 404);
} catch (Throwable $exception) {
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }
    error_log($exception->getMessage());
    respond(['status' => 'error', 'message' => 'A server or database error occurred.'], 500);
}
