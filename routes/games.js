"use strict";

import Router from 'express-promise-router';
import * as db from '../db/index.js';
import * as jose from 'jose';
import cookieParser from 'cookie-parser';

import { 
	createGame,
	createMove,
	getGameById,
	updateCurrentMoveIndex,
	getGamesByPlayerId,
	getMovesByGameId
} from '../db/games.js';

export const router = new Router();

router.use(cookieParser());

const stringToKey = (str) => {
	const encoder = new TextEncoder();
	return encoder.encode(str);
};

router.use(async (req, res, next) => {
	// authentication middleware used for all /games reqs
	// checks for a valid Bearer token
	const { andthen_auth } = req.cookies;

	if (typeof andthen_auth === 'undefined') {
		res.json({status: 'error', message: 'not authenticated', code:401})
	}

	try {
		const { payload } = await jose.jwtVerify(andthen_auth, stringToKey("your-256-bit-secret"));
		req.userId = payload.id;
		req.admin = payload.admin;
		next();
	} catch(err) {
		res.json({status: 'error', message :`jwt auth token error ${err}`, code: 401});
	}
});

router.use(async (req, res, next) => {
	// authorization middleware
	// looks for player JWT token in httponly cookie
	const { player_jwt } = req.cookies;
	if (typeof player_jwt === 'undefined') {
		res.json({status: 'error', message: 'player token missing', code:401});
	}

	try {
		const { payload } = await jose.jwtVerify(player_jwt, stringToKey("your-256-bit-secret"));
		req.playerId = payload.player_id;
		next();
	} catch(err) {
		res.json({status: 'error', message: `player token error ${err}`, code: 401});
	}
});

router.route('/')
	.get(async (req, res) => {
		const { playerId } = req;

		if(!isDefined(playerId)) {
			res.json({
				status: 'error',
				message: 'not authenticated',
				code: 400
			});
		}

		try {
			const dbRes = await getGamesByPlayerId(playerId);
			if (!Array.isArray(dbRes.rows)) {
				res.json({status: 'success', data: {games: []}});
			}
			res.json({status: 'success', data: {games: dbRes.rows}});
		} catch(err) {
			console.log('GET /games/');
			console.log(err.stack);
			res.json({status: 'error', data: {error: err.stack}});
		}
		res.json({status: 'success', data: null});
	}).post(async (req, res) => {
		const { playerId } = req;
		const { playerIds, wordsPerMove, totalMovesAllowed } = req.body.game;
		const values = [playerId, playerIds, wordsPerMove, totalMovesAllowed];

		if(!areAllDefined(values)) {
			const missing = undefinedValues(values);
			res.json({
				status: 'error', 
				message: 'missing create game required fields', 
				code: 400, 
				data: {missing: missing}
			});
		}

		try {
			const client = await db.getClient();
			const dbResult = await createGame(client, playerId, playerIds, wordsPerMove, totalMovesAllowed);
			client.release();
			res.json({status: 'success', data: dbResult.rows[0]});
		} catch (err) {
			console.log(err);
			client.release();
			res.json({status: 'error', message: 'database error', code: 500, data: {error: err}});
		}
	});

router.route('/:gameId')
	.get(async (req, res) => {
		const { playerId } = req;
		const { gameId } = req.params;
		
		const parsedGameId = parseInt(gameId, 10);
		if (!isDefined(parsedGameId) || isNaN(parsedGameId)) {
			res.json({status: 'error', message: 'game ID must be a number: ', code: 400})
		}

		if (!isDefined(playerId)) {
			res.json({status: 'error', message: 'no player ID found', code: 401});
		}

		try {
			const dbResult = await getGameById(parsedGameId);
			if (!Array.isArray(dbResult.rows) || dbResult.rows.length === 0){
				res.json({status: 'fail', data: { message: `no such game ${parsedGameId}` }});
			}

			const movesResult = await getMovesByGameId(parsedGameId);
			const moves = Array.isArray(movesResult.rows) ? movesResult.rows : [];
			res.json({ status: 'success', data: {game: dbResult.rows[0], moves: moves }});
		} catch (err) {
			console.log("GET /:gameId: ")
			console.log(err.stack)
			res.json({status: 'error', message: 'database error', code: 500, data: { error: err.stack }});
		}
	}).post(async (req, res) => {
		// to post a new move, we have to validate the player can move
		// 1) fetch the game to get the player list
		// 2) confirm this player's ID is in the player list
		// 3) use the current_move_index to determine whose turn it is and ensure it is this players turn
		// 4) use the current_move_index * words_per_move to determine whether the game is over
		const { playerId } = req;
		const { words } = req.body;
		const { gameId } = req.params;

		const parsedGameId = parseInt(gameId, 10)
		if (!isDefined(parsedGameId) || isNaN(parsedGameId)) {
			res.json({status: 'error', message: 'game ID must be a number: ', code: 400})
		}

		if (!isDefined(playerId)) {
			res.json({status: 'error', message: 'no player ID found', code: 401});
		}

		if (!isDefined(words)) {
			res.json({status: 'error', message: 'no submitted words', code: 400});
		}

		// have to keep the current move index around for when we commit the move
		// is it better to have one try block or two? not sure
		var currentMoveIdx;
		try {
			const dbRes = await getGameById(parsedGameId);
			const playerIds = dbRes.rows[0].player_ids;
			if (!playerIds.includes(playerId)) {
				res.json({status: 'fail', data: {message: 'player not in game'}});
			}

			const playerCount = playerIds.length;
			currentMoveIdx = dbRes.rows[0].current_move_index;
			const currentPlayerIdx = currentMoveIdx % playerCount;
			if(playerIds[currentPlayerIdx] != playerId) {
				res.json({status: 'fail', data: {message: 'not this player\'s turn'}});
			}

			const totalMovesAllowed = dbRes.rows[0].total_moves_allowed;
			if (currentMoveIdx > totalMovesAllowed) {
				res.json({status: 'fail', data: {message: 'the game is over'}});
			}

			const wordsPerMove = dbRes.rows[0].words_per_move;
			if (words.length > wordsPerMove) {
				res.json({status: 'fail', data: {message: 'too many words'}});
			}
		} catch (err) {
			console.log(err)
			res.json({status: 'error', message: 'db error', data:{error: err}, code: 500});
		}


		const client = await db.getClient();
		try {

			await client.query('BEGIN');
			const createMoveRes = await createMove(client, gameId, playerId, currentMoveIdx, words.join(' '));
			const updateGameRes = await updateCurrentMoveIndex(client, gameId, currentMoveIdx+1);
			await client.query('COMMIT');
			client.release();

			res.json({status: 'success', data: {result: createMoveRes.rows, indexUpdated: updateGameRes.rowCount}});
		} catch (err) {
			await client.query('ROLLBACK');
			client.release();
			console.log(err);
			res.json({status: 'error', message: 'db error', data:{error: err}, code: 500});
		}
	});

const isDefined = (value) => {
	return typeof value !== 'undefined';
}

const undefinedValues = (values) => {
	return values.map((x, i) => {return {index: i, defined: isDefined(x)}}).filter((v) => v.defined === false);
};

const areAllDefined = (values) => {
	return values.reduce((acc, x) => {
		return acc && isDefined(x)
	}, true);
}
