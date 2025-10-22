import type { MiddlewareHandler, NotFoundHandler } from 'hono';
import { Hono } from 'hono';
import 'reflect-metadata';
import { joinPath, META_KEYS } from './constants';

import type { BuildOptions, Constructor, HttpMethod, IntrospectionObject, ParamDefinition, RouteDefinition } from './types';
import { createRouteHandler } from './utils/create-handler';
import { processIntrospection } from './utils/introspect';

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

export function buildHonoApp(controllers: AnyController[], options?: BuildOptions) {
	const app = new Hono();

	const introspectionObjects: IntrospectionObject[] = [];

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

			const statusCode = (Reflect.getMetadata(META_KEYS.method.status, proto, route.propertyKey) as number | undefined) || route.statusCode;

			const schemas = (Reflect.getMetadata(META_KEYS.method.schemas, proto, route.propertyKey) || route.schemas) as
				| RouteDefinition['schemas']
				| undefined;

			const paramDefs = (Reflect.getMetadata(META_KEYS.params, proto, route.propertyKey) || []) as ParamDefinition[];

			// Introspection
			if (options?.enableIntrospection) {
				console.log('Generating introspection for route:', route.method.toUpperCase(), fullPath);
				const newRouteIntrospection = processIntrospection(route.method, paramDefs, fullPath, schemas);
				introspectionObjects.push(newRouteIntrospection!);
			}

			// Handler
			const handler = createRouteHandler(instance, route, paramDefs, schemas, statusCode);

			if (mergedMws.length > 0) {
				register(fullPath, ...mergedMws, handler);
			} else {
				register(fullPath, handler);
			}
		}
	}

	if (options?.enableIntrospection) {
		app.get(options.introspectionPath || '/introspection', (c) => {
			return c.json(introspectionObjects);
		});
	}

	if (options?.onError) {
		app.onError(options?.onError);
	}

	if (options?.notFoundHandler) {
		app.notFound(options.notFoundHandler as NotFoundHandler);
	}

	return app;
}
