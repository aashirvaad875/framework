import { Module } from '@framework/core';
import { UserController } from './controllers/user.controller.js';
import { UserService } from './services/user.service.js';
import { UserRepository } from './repositories/user.repository.js';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
