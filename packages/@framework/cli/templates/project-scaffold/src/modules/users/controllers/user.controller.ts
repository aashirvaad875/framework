import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  Res,
  Inject,
  UsePipe,
  JoiValidationPipe,
} from '@framework/core';
import { UserService } from '../services/user.service.js';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateUserJoiSchema,
  UpdateUserJoiSchema,
} from '../dto/index.js';

@Controller('/api/users')
export class UserController {
  constructor(@Inject(UserService) private userService: UserService) {}

  @Post()
  @UsePipe(new JoiValidationPipe(CreateUserJoiSchema))
  async createUser(@Body() dto: CreateUserDto, @Req() _req: any, @Res() res: any): Promise<void> {
    const user = await this.userService.createUser(dto);
    res.status(201).json({ success: true, data: user });
  }

  @Get()
  async getAllUsers(@Req() _req: any, @Res() res: any): Promise<void> {
    const users = await this.userService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  }

  @Get('/:id')
  async getUserById(@Param('id') id: string, @Req() _req: any, @Res() res: any): Promise<void> {
    const user = await this.userService.getUserById(id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  }

  @Put('/:id')
  @UsePipe(new JoiValidationPipe(UpdateUserJoiSchema))
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() _req: any,
    @Res() res: any,
  ): Promise<void> {
    const user = await this.userService.updateUser(id, dto);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data: user });
  }

  @Delete('/:id')
  async deleteUser(@Param('id') id: string, @Req() _req: any, @Res() res: any): Promise<void> {
    const deleted = await this.userService.deleteUser(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.status(204).send();
  }
}
