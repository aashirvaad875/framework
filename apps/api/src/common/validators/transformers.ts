import {
  CreateUserDto,
  UpdateUserDto,
  QueryUsersDto,
} from './dto.js';

export class DataTransformer {
  static transformCreateUserDto(data: any): CreateUserDto {
    return {
      email: String(data.email).toLowerCase().trim(),
      name: String(data.name).trim(),
      age: data.age ? Number(data.age) : undefined,
    };
  }

  static transformUpdateUserDto(data: any): UpdateUserDto {
    const dto: UpdateUserDto = {};
    if (data.email) dto.email = String(data.email).toLowerCase().trim();
    if (data.name) dto.name = String(data.name).trim();
    if (data.age) dto.age = Number(data.age);
    return dto;
  }

  static transformQueryDto(data: any): QueryUsersDto {
    return {
      search: data.search ? String(data.search).trim() : undefined,
      page: data.page ? Number(data.page) : 1,
      limit: data.limit ? Math.min(Number(data.limit), 100) : 10,
      sort:
        data.sort &&
        ['name', 'email', '-name', '-email'].includes(data.sort)
          ? (data.sort as 'name' | 'email' | '-name' | '-email')
          : 'name',
    };
  }
}
