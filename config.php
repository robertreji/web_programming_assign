<?php

/*
 * Copy the database values from the InfinityFree Control Panel:
 * MySQL Databases -> MySQL Hostname, database name, username and password.
 * Keep this file outside public version control if you add real credentials.
 */
const DB_HOST = 'sql203.infinityfree.com';
const DB_NAME = 'if0_43371009_db';
const DB_USER = 'if0_43371009';
const DB_PASSWORD = 'jquxpvcjhscgZ';

// Basic assignment authentication. Change both values before deployment.
const AUTH_USERNAME = 'admin';
const AUTH_PASSWORD = 'admin123';

function getDatabase(): PDO
{
    static $database = null;

    if ($database instanceof PDO) {
        return $database;
    }

    if (str_starts_with(DB_HOST, 'YOUR_') || str_starts_with(DB_NAME, 'YOUR_')) {
        throw new RuntimeException('InfinityFree database configuration is incomplete.');
    }

    $database = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    return $database;
}
