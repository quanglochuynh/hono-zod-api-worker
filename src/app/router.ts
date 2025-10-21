import type { MiddlewareHandler, NotFoundHandler } from 'hono';
import { Hono } from 'hono';
import 'reflect-metadata';
import { ZodError } from 'zod';
import { META_KEYS, joinPath } from './constants';
import type { BuildOptions, Constructor, HttpMethod, ParamDefinition, RouteDefinition } from './types';

type AnyController = Constructor<any>;

function methodToRegister(app: Hono, method: HttpMethod) {
	switch (method) {
		case 'get':
			return app.get.bind(app);
		case 'post':
			return app.post.bind(app);
		case 'put':
			return app.put.bind(app);
		case 'patch':
			return app.patch.bind(app);
		case 'delete':
			return app.delete.bind(app);
		case 'options':
			return app.options.bind(app);
		case 'all':
			return app.all.bind(app);
	}
}

async function parseBody(c: any) {
	const ct = c.req.header('content-type') || '';
	try {
		if (ct.includes('application/json')) {
			return await c.req.json();
		}
	} catch {
		// Fall through to other body types
	}
	if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
		// Hono parses both via parseBody
		const body = await c.req.parseBody();
		return body;
	}
	// For raw or text
	try {
		const t = await c.req.text();
		return t;
	} catch {
		return undefined;
	}
}

function formatZodError(err: ZodError, rootPath?: string) {
	return {
		message: 'Validation failed',
		issues: err.issues.map((i) => ({
			path: `${rootPath || ''}${i.path.join('.')}`,
			message: i.message,
			code: i.code,
		})),
	};
}

export function buildHonoApp(controllers: AnyController[], options?: BuildOptions) {
	const app = new Hono();

	if (options?.topMiddlewares && options.topMiddlewares.length > 0) {
		for (const { path, middlewares } of options.topMiddlewares) {
			app.use(path, ...middlewares);
		}
	}

	for (const Ctor of controllers) {
		const instance = new Ctor();
		const proto = Ctor.prototype;

		const basePath = (Reflect.getMetadata(META_KEYS.controller.basePath, Ctor) || '') as string;
		// console.log('Registering controller:', Ctor.name, 'with base path:', basePath);

		const controllerMws = (Reflect.getMetadata(META_KEYS.controller.middlewares, Ctor) || []) as MiddlewareHandler[];

		app.use(`${basePath}/*`, ...controllerMws); // Apply controller-level middlewares

		const routes = (Reflect.getMetadata(META_KEYS.routes, Ctor) || []) as RouteDefinition[];

		for (const route of routes) {
			// console.log('Processing route:', route);

			const register = methodToRegister(app, route.method);
			let fullPath = joinPath(options?.base ? options.base : '', joinPath(basePath, route.path));
			// Remove trailing slash except when the path is just "/"
			if (fullPath.length > 1 && fullPath.endsWith('/')) {
				fullPath = fullPath.slice(0, -1);
			}

			// console.log(`Registering route: [${route.method.toUpperCase()}] ${fullPath} -> ${Ctor.name}.${String(route.propertyKey)}`);

			// Also read method-level metadata stored directly (in case decorator order differs)
			const methodLevelMiddlewares = (Reflect.getMetadata(META_KEYS.method.middlewares, proto, route.propertyKey) ||
				[]) as MiddlewareHandler[];
			const mergedMws = [...(route.middlewares || []), ...methodLevelMiddlewares];

			const statusCode = (Reflect.getMetadata(META_KEYS.method.status, proto, route.propertyKey) as number | undefined) ?? route.statusCode;

			const schemas = (Reflect.getMetadata(META_KEYS.method.schemas, proto, route.propertyKey) || route.schemas) as
				| RouteDefinition['schemas']
				| undefined;

			const paramDefs = (Reflect.getMetadata(META_KEYS.params, proto, route.propertyKey) || []) as ParamDefinition[];

			const handler = async (c: any) => {
				try {
					// Prepare data containers
					let bodyData: any;
					let queryAll: Record<string, string | string[] | undefined> | undefined;
					let paramsAll: Record<string, string> | undefined;
					let headersAll: Record<string, string> | undefined;

					// Load raw aggregates if method-level schemas exist
					if (schemas?.body) bodyData = await parseBody(c);
					if (schemas?.query) queryAll = c.req.queries();
					if (schemas?.params) paramsAll = c.req.param();
					if (schemas?.headers) {
						headersAll = {};
						// Normalize: Hono's c.req.raw.headers is Headers
						for (const [k, v] of c.req.raw.headers) {
							headersAll[k.toLowerCase()] = v;
						}
					}

					// Validate full objects first if provided
					if (schemas?.body) {
						const parsed = schemas.body.safeParse(bodyData);
						if (!parsed.success) {
							return c.json(formatZodError(parsed.error), 400);
						}
						bodyData = parsed.data;
					}
					if (schemas?.query) {
						const parsed = schemas.query.safeParse(queryAll ?? c.req.queries());
						if (!parsed.success) {
							return c.json(formatZodError(parsed.error), 400);
						}
						queryAll = parsed.data as Record<string, string | string[] | undefined>;
					}
					if (schemas?.params) {
						const parsed = schemas.params.safeParse(paramsAll ?? c.req.param());
						if (!parsed.success) {
							return c.json(formatZodError(parsed.error), 400);
						}
						paramsAll = parsed.data as Record<string, string>;
					}
					if (schemas?.headers) {
						const parsed = schemas.headers.safeParse(headersAll);
						if (!parsed.success) {
							return c.json(formatZodError(parsed.error), 400);
						}
						headersAll = parsed.data as Record<string, string>;
					}

					// Build arguments based on param decorators
					const maxIndex = paramDefs.reduce((m, p) => Math.max(m, p.index), -1);
					const args = new Array(maxIndex + 1).fill(undefined);

					for (const p of paramDefs) {
						switch (p.type) {
							case 'ctx': {
								args[p.index] = c;
								break;
							}
							case 'req': {
								args[p.index] = c.req;
								break;
							}
							case 'body': {
								const raw = bodyData ?? (bodyData = await parseBody(c));
								if (p.schema) {
									const parsed = p.schema.safeParse(raw);
									if (!parsed.success) {
										return c.json(formatZodError(parsed.error), 400);
									}
									args[p.index] = parsed.data;
								} else {
									args[p.index] = raw;
								}
								break;
							}
							case 'query': {
								if (p.name) {
									const raw = c.req.query(p.name);
									if (p.schema) {
										const parsed = p.schema.safeParse(raw);
										if (!parsed.success) {
											return c.json(formatZodError(parsed.error, p.name), 400);
										}
										args[p.index] = parsed.data;
									} else {
										args[p.index] = raw;
									}
								} else {
									const all = queryAll ?? c.req.queries();
									if (p.schema) {
										const parsed = p.schema.safeParse(all);
										if (!parsed.success) {
											return c.json(formatZodError(parsed.error), 400);
										}
										args[p.index] = parsed.data;
									} else {
										args[p.index] = all;
									}
								}
								break;
							}
							case 'param': {
								const val = p.name ? c.req.param(p.name) : c.req.param();
								if (p.schema) {
									const parsed = p.schema.safeParse(val);
									if (!parsed.success) {
										return c.json(formatZodError(parsed.error), 400);
									}
									args[p.index] = parsed.data;
								} else {
									args[p.index] = val;
								}
								break;
							}
							case 'header': {
								if (p.name) {
									const raw = c.req.header(p.name);
									if (p.schema) {
										const parsed = p.schema.safeParse(raw);
										if (!parsed.success) {
											return c.json(formatZodError(parsed.error), 400);
										}
										args[p.index] = parsed.data;
									} else {
										args[p.index] = raw;
									}
								} else {
									const all: Record<string, string> = {};
									for (const [k, v] of c.req.raw.headers) {
										all[k.toLowerCase()] = v;
									}
									if (p.schema) {
										const parsed = p.schema.safeParse(all);
										if (!parsed.success) {
											return c.json(formatZodError(parsed.error), 400);
										}
										args[p.index] = parsed.data;
									} else {
										args[p.index] = all;
									}
								}
								break;
							}
						}
					}

					// Call the actual method
					const result = await instance[route.propertyKey as keyof typeof instance](...args);

					if (result instanceof Response) {
						return result;
					}

					if (result === undefined) {
						return c.body(null, 204);
					}

					if (typeof statusCode === 'number') {
						return c.json(result, statusCode);
					}

					return c.json(result);
				} catch (err: any) {
					// error will be handled by app-level error handler
					throw err;
				}
			};

			if (mergedMws.length > 0) {
				register(fullPath, ...mergedMws, handler);
			} else {
				register(fullPath, handler);
			}
		}
	}

	if (options?.onError) {
		app.onError(options?.onError);
	}

	if (options?.notFoundHandler) {
		app.notFound(options.notFoundHandler as NotFoundHandler);
	}

	return app;
}
