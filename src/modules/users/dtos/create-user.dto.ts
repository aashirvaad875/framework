import Joi from 'joi';

export class CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  bio?: string;
}

export const createUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be valid',
    'any.required': 'Email is required',
  }),
  firstName: Joi.string().max(255).required().messages({
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().max(255).required().messages({
    'any.required': 'Last name is required',
  }),
  phoneNumber: Joi.string().optional(),
  bio: Joi.string().optional(),
});
