import Router from 'express-promise-router';
import { createGame } from '../db/games.js';
import * as jose from 'jose';
import cookieParser from 'cookie-parser';

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
	var id;
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
		res.json({status: 'success', data: null});
	}).post(async (req, res) => {
		const { playerId } = req;
		const { playerIds, wordsPerMove, totalWordsAllowed } = req.body.game;
		const values = [playerId, playerIds, wordsPerMove, totalWordsAllowed];

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
			const dbResult = await createGame(playerId, playerIds, wordsPerMove, totalWordsAllowed);
			res.json({status: 'success', data: dbResult.rows[0]});
		} catch (err) {
			console.log(err);
			res.json({status: 'error', message: 'database error', code: 500, data: {error: err}});
		}
	});

router.route('/:gameId')
	.get(async (req, res) => {
		res.json({status: 'success', data: null});
	}).post(async (req, res) => {
		res.json({status: 'success', data: null});
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
