import { WorkerEntrypoint } from 'cloudflare:workers';
import 'reflect-metadata';
import { buildHonoApp } from './app/router';
import { TodoController } from './features/todos/todo.controller';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { ErrorMiddleware } from './middlewares/error.middleware';

const app = buildHonoApp([TodoController], {
	base: '/',
	topMiddlewares: [
		{
			path: '/int/*',
			middlewares: [AuthMiddleware],
		},
	],
	notFoundHandler: async () => {
		return new Response(JSON.stringify({ message: 'Resource Not Found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	},
	onError: ErrorMiddleware,
	enableIntrospection: true,
	introspectionPath: '/introspect',
});

export default class extends WorkerEntrypoint {
	declare env: Env;

	fetch(request: Request): Response | Promise<Response> {
		return app.fetch(request, this.env, this.ctx);
	}
}
