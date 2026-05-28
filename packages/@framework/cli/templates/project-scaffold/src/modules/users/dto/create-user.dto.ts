import Joi from 'joi';

export interface CreateUserDto {
  email: string;
  name: string;
}

export const CreateUserJoiSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(100).required(),
});
