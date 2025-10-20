import { WorkerEntrypoint } from 'cloudflare:workers';
import 'reflect-metadata';

import { buildHonoApp } from './app/router';
import { TodoController } from './features/todos/todo.controller';
import { AuthMiddleware } from './middlewares/auth.middleware';

const app = buildHonoApp([TodoController], {
	base: '/',
	topMiddlewares: [
		{
			path: '/int/*',
			middlewares: [AuthMiddleware],
		},
	],
	onError: (err) => {
		return new Response(JSON.stringify({ message: 'Internal Server Error', details: String(err) }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	},
	notFoundHandler: async () => {
		return new Response(JSON.stringify({ message: 'Resource Not Found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	},
});

export default class extends WorkerEntrypoint {
	declare env: Env;

	fetch(request: Request): Response | Promise<Response> {
		return app.fetch(request, this.env, this.ctx);
	}
}
