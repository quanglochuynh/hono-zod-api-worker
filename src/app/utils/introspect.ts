import { HttpMethod, IntrospectionObject, MethodSchemas, ParamDefinition } from '../types';
import { cleanSchemaForIntrospection, unwrapSingleItemArray } from './common-utils';

export function processIntrospection(
	method: HttpMethod,
	paramDefs: ParamDefinition[],
	path: string,

	schemas?: MethodSchemas,
): IntrospectionObject {
	const paramSchemas = [];
	const querySchemas = [];
	const bodySchemas = [];
	const headerSchemas = [];
	for (const p of paramDefs) {
		if (p.schema && p.type === 'param') {
			paramSchemas.push(cleanSchemaForIntrospection(p.schema, p.name));
		}
		if (p.type === 'query' && p.schema) {
			querySchemas.push(cleanSchemaForIntrospection(p.schema, p.name));
		}
		if (p.type === 'body' && p.schema) {
			bodySchemas.push(cleanSchemaForIntrospection(p.schema));
		}
		if (p.type === 'header' && p.schema) {
			headerSchemas.push(cleanSchemaForIntrospection(p.schema, p.name));
		}
	}

	if (schemas?.params) {
		paramSchemas.push(cleanSchemaForIntrospection(schemas.params));
	}
	if (schemas?.query) {
		querySchemas.push(cleanSchemaForIntrospection(schemas.query));
	}
	if (schemas?.body) {
		bodySchemas.push(cleanSchemaForIntrospection(schemas.body));
	}
	if (schemas?.headers) {
		headerSchemas.push(cleanSchemaForIntrospection(schemas.headers));
	}

	const newRouteIntrospection = {
		method: method,
		path: path,
		schema: {
			body: unwrapSingleItemArray(bodySchemas),
			query: unwrapSingleItemArray(querySchemas),
			params: unwrapSingleItemArray(paramSchemas),
			headers: unwrapSingleItemArray(headerSchemas),
		},
	};
	return newRouteIntrospection;
}
