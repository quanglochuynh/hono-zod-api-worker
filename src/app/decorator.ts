import type { MiddlewareHandler } from 'hono';
import 'reflect-metadata';
import { META_KEYS } from './constants';
import type { Constructor, HttpMethod, MethodSchemas, ParamDefinition } from './types';

// Controller decorator
export function Controller(basePath = '', ...middlewares: MiddlewareHandler[]) {
	return function <T extends Constructor>(target: T) {
		Reflect.defineMetadata(META_KEYS.controller.basePath, basePath, target);
		const existing = (Reflect.getMetadata(META_KEYS.controller.middlewares, target) || []) as MiddlewareHandler[];
		Reflect.defineMetadata(META_KEYS.controller.middlewares, [...existing, ...middlewares], target);
		return target;
	};
}

// Method-level middleware decorator
export function Use(...middlewares: MiddlewareHandler[]) {
	return function (target: any, propertyKey: string | symbol) {
		const existing = (Reflect.getMetadata(META_KEYS.method.middlewares, target, propertyKey) || []) as MiddlewareHandler[];
		Reflect.defineMetadata(META_KEYS.method.middlewares, [...existing, ...middlewares], target, propertyKey);
	};
}

// Method-level status code decorator
export function HttpCode(status: number) {
	return function (target: any, propertyKey: string | symbol) {
		Reflect.defineMetadata(META_KEYS.method.status, status, target, propertyKey);
	};
}

// Method-level validation decorator for full objects
export function Validate(schemas: MethodSchemas) {
	return function (target: any, propertyKey: string | symbol) {
		Reflect.defineMetadata(META_KEYS.method.schemas, schemas, target, propertyKey);
	};
}

// Route method decorators factory
function createRouteDecorator(method: HttpMethod) {
	return function (path = '', ...middlewares: MiddlewareHandler[]) {
		return function (target: any, propertyKey: string | symbol) {
			const ctor = target.constructor;
			const routes = (Reflect.getMetadata(META_KEYS.routes, ctor) || []) as any[];

			// Pull method-level metadata to attach later during build as well
			const methodLevelMiddlewares = (Reflect.getMetadata(META_KEYS.method.middlewares, target, propertyKey) || []) as MiddlewareHandler[];
			const statusCode = Reflect.getMetadata(META_KEYS.method.status, target, propertyKey) as number | undefined;
			const schemas = (Reflect.getMetadata(META_KEYS.method.schemas, target, propertyKey) || undefined) as MethodSchemas | undefined;

			const route = {
				method,
				path,
				propertyKey,
				middlewares: [...methodLevelMiddlewares, ...middlewares],
				statusCode,
				schemas,
			};
			Reflect.defineMetadata(META_KEYS.routes, [...routes, route], ctor);
		};
	};
}

export const Get = createRouteDecorator('get');
export const Post = createRouteDecorator('post');
export const Put = createRouteDecorator('put');
export const Patch = createRouteDecorator('patch');
export const Delete = createRouteDecorator('delete');
export const Options = createRouteDecorator('options');
// export const Head = createRouteDecorator('head');
export const All = createRouteDecorator('all');

// Parameter decorators
function addParamMetadata(target: any, propertyKey: string | symbol, meta: ParamDefinition) {
	const existing = (Reflect.getMetadata(META_KEYS.params, target, propertyKey) || []) as ParamDefinition[];
	Reflect.defineMetadata(META_KEYS.params, [...existing, meta], target, propertyKey);
}

export function Body(schema?: any) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'body', schema });
	};
}

export function Query(name?: string, schema?: any) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'query', name, schema });
	};
}

export function Param(name: string, schema?: any) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'param', name, schema });
	};
}

export function Header(name?: string, schema?: any) {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'header', name, schema });
	};
}

export function Ctx() {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'ctx' });
	};
}

export function Req() {
	return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
		addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'req' });
	};
}
