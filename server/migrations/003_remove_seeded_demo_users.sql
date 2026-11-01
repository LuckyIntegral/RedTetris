-- Remove the demo accounts that 001 used to seed with the publicly known password 'test123'.
-- Only rows that still carry that exact hash are deleted, so a real account is never touched.
DELETE FROM users
WHERE username IN ('player1', 'player2', 'player3')
  AND password_hash = '$2b$10$JtWgBljSEhvrFQquc7uJou5Pbl/2rR35YaQwDRdnEw1k7CPMQZwz2';
