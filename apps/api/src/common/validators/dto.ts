export class CreateUserDto {
  email!: string;
  name!: string;
  age?: number;
}

export class UpdateUserDto {
  email?: string;
  name?: string;
  age?: number;
}

export class QueryUsersDto {
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'name' | 'email' | '-name' | '-email';
}

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  age?: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class HealthCheckDto {
  check?: 'full' | 'basic';
}
