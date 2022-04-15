import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool();

// taken from https://node-postgres.com/guides/project-structure

export async function query(text, params) {
	const start = Date.now();
	const res = await pool.query(text, params);
	const duration = Date.now() - start;
	console.log('executed query', { text, duration, rows: res.rowCount });
	return res;
}

export async function getClient() {
	const client = await pool.connect();
	const query = client.query;
	const release = client.release;

	const timeout = setTimeout(() => {
		console.error('A client has been checked out for more than 5 seconds!');
		console.error(`The last executed query on this client was: ${client.lastQuery}`);
	}, 5000);

	client.query = (...args) => {
		client.lastQuery = args;
		return query.apply(client, args);
	};

	client.release = () => {
		clearTimeout(timeout);
		client.query = query;
		client.release = release;
		return release.apply(client);
	};
	return client;
}

// get a client but don't log errors due to timeout
export async function getClientListener()  {
	const client = await pool.connect();
	return client;
}
