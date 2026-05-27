import { Request, Response } from 'express';
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '../../../core/decorators/index.js';
import { UserService } from '../services/user.service.js';
import { CreateUserDto } from '../dtos/create-user.dto.js';
import { JoiValidationPipe } from '../../../core/pipes/validation.pipe.js';
import { createUserSchema } from '../dtos/create-user.dto.js';

@Controller('/api/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  async createUser(@Body() body: CreateUserDto, req: Request, res: Response): Promise<void> {
    const validationPipe = new JoiValidationPipe(createUserSchema);
    const validatedData = await validationPipe.transform(body);

    const user = await this.userService.createUser(validatedData);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  }

  @Get()
  async getUsers(@Query() query: any, req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(query.limit) || 10, 100);
    const offset = parseInt(query.offset) || 0;

    const result = await this.userService.getUsers(limit, offset);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    });
  }

  @Get('/:id')
  async getUserById(@Param('id') id: string, req: Request, res: Response): Promise<void> {
    const user = await this.userService.getUserById(id);

    res.status(200).json({
      success: true,
      data: user,
    });
  }

  @Put('/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: Partial<CreateUserDto>,
    req: Request,
    res: Response
  ): Promise<void> {
    const user = await this.userService.updateUser(id, body);

    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully',
    });
  }

  @Delete('/:id')
  async deleteUser(@Param('id') id: string, req: Request, res: Response): Promise<void> {
    await this.userService.deleteUser(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  }

  @Get('/active/list')
  async getActiveUsers(@Query() query: any, req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(query.limit) || 10, 100);
    const offset = parseInt(query.offset) || 0;

    const result = await this.userService.getActiveUsers(limit, offset);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    });
  }
}
