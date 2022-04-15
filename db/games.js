import * as db from './index.js';

// create / update/ get games

export const createGame = (ownerId, playerIds, wordsPerMove, totalMovesAllowed) => {
	// owner is the ID of the game owner
	// player_ids is an array of other player IDs
	// wordsPerMove is the number of words to be entered per move
	// totalWordsAllowed is the length of story at which the game ends
	// returns a Promise so should be awaited.
	
	const queryString = `
	INSERT INTO games(owner_id, player_ids, words_per_move, total_moves_allowed, current_move_index, created_at)
	VALUES($1, $2, $3, $4, 0, $5) RETURNING *;
	`;
	return db.query(queryString, [ownerId, playerIds, wordsPerMove, totalMovesAllowed, new Date().toISOString()]);
};

export const updateCurrentMoveIndex = (gameId, newIndex) => {
	return db.query('UPDATE games SET current_move_index = $1 WHERE id = $2',
		[newIndex, gameId]
	);
}

export const getGameById = (gameId) => {
	return db.query("SELECT * FROM games WHERE id = $1;", [gameId]);
};

export const getGamesByOwnerId = (ownerId) => {
	return db.query("SELECT * FROM games WHERE owner_id = $1;", [ownerId]);
};

export const getGamesByPlayerId = (playerId) => {
	return db.query("SELECT * FROM games WHERE $1 IN player_ids;", [playerId]);
};

// create / update / get moves

export const getMovesByGameId = (gameId) => {
	return db.query("SELECT * FROM moves WHERE game_id = $1", [gameId])
};

export const createMove = (gameId, playerId, indexInStory, words) => {
	const queryString = `
	INSERT INTO moves(game_id, player_id, index_in_story, words, created_at)
	VALUES($1, $2, $3, $4, $5) RETURNING *;
	`;
	return db.query(queryString, [gameId, playerId, indexInStory, words, new Date().toISOString()]);
};
