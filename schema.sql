CREATE TABLE IF NOT EXISTS movies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    category VARCHAR(60) NOT NULL,
    language VARCHAR(60) NOT NULL,
    rating DECIMAL(3,1) NOT NULL,
    release_year SMALLINT UNSIGNED NOT NULL,
    poster_url VARCHAR(500) NULL,
    duration VARCHAR(30) NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_movie_rating CHECK (rating BETWEEN 0 AND 10),
    CONSTRAINT chk_movie_year CHECK (release_year BETWEEN 1900 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS genres (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id INT UNSIGNED NOT NULL,
    genre_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (movie_id, genre_id),
    CONSTRAINT fk_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    CONSTRAINT fk_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO genres (name) VALUES
    ('Action'), ('Comedy'), ('Drama'), ('Thriller'), ('Sci-Fi'),
    ('Romance'), ('Mystery'), ('Fantasy')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO movies (id, title, category, language, rating, release_year, poster_url, duration, description) VALUES
(1, 'Aavesham', 'Action', 'Malayalam', 8.5, 2024, 'https://image.tmdb.org/t/p/w500/k5RWPaNjgRcNvGoawYaQHQwyctI.jpg', '2h 38m', 'An eccentric gangster adopts three college students in Bengaluru.'),
(2, 'Manjummel Boys', 'Drama', 'Malayalam', 8.6, 2024, 'https://image.tmdb.org/t/p/w500/bswrtewwthpsh6nABiqKevU4UBI.jpg', '2h 15m', 'A group of friends faces danger in Guna Caves.'),
(3, 'Leo', 'Action', 'Tamil', 7.9, 2023, 'https://image.tmdb.org/t/p/w500/2XUHC4lp3tDsgfFLFygNZ2x2Um9.jpg', '2h 44m', 'A cafe owner is forced to confront his violent past.'),
(4, 'Inception', 'Action', 'English', 8.8, 2010, 'https://image.tmdb.org/t/p/w500/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg', '2h 28m', 'A specialist steals secrets through shared dreams.'),
(5, 'Premalu', 'Comedy', 'Malayalam', 8.4, 2024, 'https://image.tmdb.org/t/p/w500/uPpmBjY3znUqGY8kYwI5xvOrSc0.jpg', '2h 36m', 'A romantic comedy set in Hyderabad.'),
(6, 'Interstellar', 'Drama', 'English', 8.7, 2014, 'https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg', '2h 49m', 'Explorers travel through a wormhole to save humanity.'),
(7, 'The Dark Knight', 'Action', 'English', 9.0, 2008, 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', '2h 32m', 'Batman faces the Joker in Gotham.'),
(8, 'Kishkindha Kaandam', 'Thriller', 'Malayalam', 8.3, 2024, 'https://image.tmdb.org/t/p/w500/rniBYHDRs6e8qMkPr4D4ZE5uMhF.jpg', '2h 05m', 'A missing firearm leads to a mystery in a forest reserve.'),
(9, 'Dune: Part Two', 'Action', 'English', 8.5, 2024, 'https://image.tmdb.org/t/p/w500/3HzGtM0JpfH2pWFGugJK22LRP6b.jpg', '2h 46m', 'Paul Atreides unites with the Fremen.'),
(10, 'Lokah: Chapter 1', 'Action', 'Malayalam', 8.9, 2026, 'https://image.tmdb.org/t/p/w500/nRn6is4m5sikO1rSoCoRT2rYtXB.jpg', '2h 40m', 'A fantasy action saga set in a futuristic India.')
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT IGNORE INTO movie_genres (movie_id, genre_id)
SELECT m.id, g.id FROM movies m JOIN genres g ON
    (m.id = 1 AND g.name IN ('Action', 'Comedy')) OR
    (m.id = 2 AND g.name IN ('Drama', 'Thriller')) OR
    (m.id = 3 AND g.name IN ('Action', 'Thriller')) OR
    (m.id = 4 AND g.name IN ('Action', 'Sci-Fi')) OR
    (m.id = 5 AND g.name IN ('Comedy', 'Romance')) OR
    (m.id = 6 AND g.name IN ('Drama', 'Sci-Fi')) OR
    (m.id = 7 AND g.name IN ('Action', 'Drama')) OR
    (m.id = 8 AND g.name IN ('Thriller', 'Mystery')) OR
    (m.id = 9 AND g.name IN ('Action', 'Sci-Fi')) OR
    (m.id = 10 AND g.name IN ('Action', 'Fantasy'));
