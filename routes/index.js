import * as games from './games.js';

export const mountRoutes = app => {
	app.use('/games', games.router);
};
