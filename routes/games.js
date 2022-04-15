import Router from 'express-promise-router';
import * as db from '../db/index.js';
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
		req.body.user_id = payload.id;
		req.body.admin = payload.admin;
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
		const { id } = payload;
		req.body.player_id = id;
		next();
	} catch(err) {
		res.json({status: 'error', message: `player token error ${err}`, code: 401});
	}
});

router.route('/')
	.get(async (req, res) => {
		res.json({status: 'success', data: null});
	}).post(async (req, res) => {
		res.json({status: 'success', data: null});
	});

router.route('/:gameId')
	.get(async (req, res) => {
		res.json({status: 'success', data: null});
	}).post(async (req, res) => {
		res.json({status: 'success', data: null});
	});
