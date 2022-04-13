'use strict';

import express from 'express';
import * as routes from './routes/index.js';

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();
app.use(express.json());

routes.mountRoutes(app);

app.listen(PORT, HOST);

console.log(`Running on http://${HOST}:${PORT}`);
