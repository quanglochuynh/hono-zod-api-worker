export const META_KEYS = {
	controller: {
		basePath: 'hono:controller:basePath',
		middlewares: 'hono:controller:middlewares',
	},
	routes: 'hono:routes',
	params: 'hono:params',
	method: {
		middlewares: 'hono:method:middlewares',
		status: 'hono:method:status',
		schemas: 'hono:method:schemas',
	},
} as const;

export function joinPath(a: string, b: string) {
	const aa = a.endsWith('/') ? a.slice(0, -1) : a;
	const bb = b.startsWith('/') ? b : `/${b}`;
	return (aa + bb).replace(/\/{2,}/g, '/');
}
