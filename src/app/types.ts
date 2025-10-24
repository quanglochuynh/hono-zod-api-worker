import type { ErrorHandler, MiddlewareHandler } from 'hono';
import type { ZodObject, ZodRawShape, ZodType } from 'zod';

export type Constructor<T = any> = new (...args: any[]) => T;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'all';

export type ParamType = 'body' | 'query' | 'param' | 'header' | 'ctx' | 'req';

export type ParamDefinition = {
	index: number;
	type: ParamType;
	name?: string | undefined;
	schema?: ZodType | undefined;
};

export type MethodSchemas = Partial<{
	body: ZodType;
	query: ZodType;
	params: ZodType;
	headers: ZodType;
}>;

export type RouteDefinition = {
	handlerName: string;
	method: HttpMethod;
	path: string;
	propertyKey: string | symbol;
	middlewares?: MiddlewareHandler[];
	statusCode?: number;
	schemas?: MethodSchemas;
};

export type BuildOptions = {
	base?: string;
	topMiddlewares?: { path: string; middlewares: MiddlewareHandler[] }[];
	onError?: ErrorHandler;
	notFoundHandler?: MiddlewareHandler;
	enableIntrospection?: boolean;
	introspectionPath?: string;
};

export type ZodStringSchema = {
	name: string;
	type: 'string';
	minLength?: number;
	maxLength?: number;
};
export type ZodNumberSchema = {
	name: string;
	type: 'number';
	minimum?: number;
	maximum?: number;
};
export type ZodBooleanSchema = {
	name: string;
	type: 'boolean';
};

export type ZodObjectSchema = {
	name: string;
	type: 'object';
	properties: Record<string, any>;
};

export type ZodArraySchema = {
	name: string;
	type: 'array';
	items: any;
};

export type SWTZodSchema =
	| ZodStringSchema
	| ZodNumberSchema
	| ZodBooleanSchema
	| ZodObjectSchema
	| ZodArraySchema;

export type IntrospectionObject = {
	name: string;
	method: HttpMethod;
	path: string;
	schema?: {
		body?: SWTZodSchema[];
		query?: SWTZodSchema[];
		params?: SWTZodSchema[];
		headers?: SWTZodSchema[];
	};
};

type DecoratorOptionsWithSchema = {
	// withSchema: true;
	schema: ZodType;
};

type DecoratorOptionsWithoutSchema = {
	// withSchema?: false;
	name: string;
	schema?: ZodType;
};

export type DecoratorOptions = DecoratorOptionsWithSchema | DecoratorOptionsWithoutSchema;

export type AnyZodObject = ZodObject<ZodRawShape>;
