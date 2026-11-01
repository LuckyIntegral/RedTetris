-- Every JWT carries the token_version it was issued with. Logout increments it,
-- which revokes all tokens issued before.
ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
