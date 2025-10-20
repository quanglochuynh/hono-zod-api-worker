import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '../../app/decorator';
import { CommonError } from '../../middlewares/error.middleware';
import type { CreateTodoInput, UpdateTodoInput } from './todo.dto';
import { createTodoSchema, limitSchema, skipSchema, updateTodoSchema } from './todo.dto';

let mockTodos = (await import('./mock-todo.json')).default as any[];

@Controller('/int/todos') // controller-level middleware
export class TodoController {
	@Get()
	async getTodos(@Query('skip', skipSchema) skip?: number, @Query('limit', limitSchema) limit?: number) {
		return mockTodos.slice(skip || 0, limit ? (skip || 0) + limit : undefined);
	}

	@Get('/:id')
	async getTodoById(@Param('id') id: string) {
		const todo = mockTodos.find((t) => t.id === id);
		if (todo) {
			return todo;
		}
		throw new CommonError(404, 'Todo not found');
	}

	@Post()
	createTodo(@Body(createTodoSchema) body: CreateTodoInput) {
		const newTodo = { id: String(mockTodos.length + 1), ...body, completed: false };
		mockTodos.push(newTodo);
		return {
			success: true,
			data: newTodo,
		};
	}

	@Put('/:id')
	updateTodo(@Param('id') id: string, @Body(updateTodoSchema) body: UpdateTodoInput) {
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
	deleteTodo(@Param('id') id: string) {
		const index = mockTodos.findIndex((t) => t.id === id);
		if (index === -1) {
			throw new CommonError(404, 'Todo not found');
		}
		mockTodos.splice(index, 1);
		return {
			success: true,
		};
	}
}
