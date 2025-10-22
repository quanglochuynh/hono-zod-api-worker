import z from 'zod';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '../../app/decorator';
import { CommonError } from '../../middlewares/error.middleware';
import {
	type CreateTodoInput,
	createTodoSchema,
	type PaginateInput,
	paginateSchema,
	type UpdateTodoInput,
	updateTodoSchema,
} from './todo.dto';

let mockTodos = (await import('./mock-todo.json')).default as any[];

@Controller('/int/todos') // controller-level middleware
export class TodoController {
	@Get()
	async getTodos(@Query({ schema: paginateSchema }) page: PaginateInput) {
		const { skip, limit } = page;
		return mockTodos.slice(skip || 0, limit ? (skip || 0) + limit : undefined);
	}

	@Get('/:id')
	async getTodoById(
		@Param({
			name: 'id',
			schema: z.number().min(0),
		})
		id: number,
	) {
		const todo = mockTodos.find((t) => t.id === id);
		if (todo) {
			return todo;
		}
		throw new CommonError(404, 'Todo not found');
	}

	@Post()
	@HttpCode(201)
	createTodo(@Body(createTodoSchema) body: CreateTodoInput) {
		const newTodo = { id: String(mockTodos.length + 1), ...body, completed: false };
		mockTodos.push(newTodo);
		return {
			success: true,
			data: newTodo,
		};
	}

	@Put('/:id')
	updateTodo(
		@Param({
			name: 'id',
			schema: z.string().min(0),
		})
		id: string,
		@Body(updateTodoSchema) body: UpdateTodoInput,
	) {
		const todo = mockTodos.find((t) => t.id === id);
		if (!todo) {
			throw new CommonError(404, 'Todo not found');
		}
		todo.title = body.title;
		todo.completed = body.completed;
		return {
			success: true,
			data: todo,
		};
	}

	@Delete('/:id')
	deleteTodo(
		@Param({
			name: 'id',
			schema: z.coerce.number().min(0),
		})
		id: number,
	) {
		const index = mockTodos.findIndex((t) => t.id === id);
		if (index === -1) {
			throw new CommonError(404, 'Todo not found');
		}
		mockTodos.splice(index, 1);
		return {
			success: true,
		};
	}

	// @Post('/foo')
	// async getFoo(
	// 	@Body(paginateSchema)
	// 	page: PaginateInput,
	// ) {
	// 	return {
	// 		message: `You sent ${JSON.stringify(page)}`,
	// 	};
	// }
}
