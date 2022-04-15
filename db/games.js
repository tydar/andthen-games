import * as db from './index.js';

export const createGame = (ownerId, playerIds, wordsPerMove, totalWordsAllowed) => {
	// owner is the ID of the game owner
	// player_ids is an array of other player IDs
	// wordsPerMove is the number of words to be entered per move
	// totalWordsAllowed is the length of story at which the game ends
	// returns a Promise so should be awaited.
	
	const queryString = `
	INSERT INTO games(owner_id, player_ids, words_per_move, total_words_allowed, current_word_index, created_at)
	VALUES($1, $2, $3, $4, 0, $5) RETURNING *;
	`;
	return db.query(queryString, [ownerId, playerIds, wordsPerMove, totalWordsAllowed, new Date().toISOString()]);
};

export const getGameById = (gameId) => {
	return db.query("SELECT * FROM games WHERE id = $1;", [gameId]);
};

export const getGamesByOwnerId = (ownerId) => {
	return db.query("SELECT * FROM games WHERE owner_id = $1;", [ownerId]);
};

export const getGamesByPlayerId = (playerId) => {
	return db.query("SELECT * FROM games WHERE $1 IN player_ids;", [playerId]);
};
