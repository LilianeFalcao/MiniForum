-- Active: 1720305142887@@127.0.0.1@3306
CREATE TABLE users (
    id TEXT PRIMARY KEY UNIQUE NOT NULL,
    apelido TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT UNIQUE NOT NULL
);

CREATE TABLE posts (
    id TEXT PRIMARY KEY UNIQUE NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    numeroLikes INT,
    numeroDeslikes INT,
    numeroComentarios INT,
    user_id TEXT NOT NULL,
    Foreign Key (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
    id TEXT PRIMARY KEY NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    post_id  TEXT NOT NULL,
    content TEXT NOT NULL,
    Foreign Key (user_id) REFERENCES users(id),
    Foreign Key (post_id) REFERENCES posts(id)
);

CREATE TABLE reactions (
    id TEXT PRIMARY KEY NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'deslike','removeLike', 'removeDeslike' )),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
);