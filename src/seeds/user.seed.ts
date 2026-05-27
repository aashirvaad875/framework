import { getDataSource } from '../core/database.js';
import { UserEntity } from '../modules/users/entities/user.entity.js';
import { Logger } from '../common/logger.js';

const logger = new Logger('UserSeed');

export async function seedUsers(): Promise<void> {
  try {
    const dataSource = getDataSource();
    const userRepository = dataSource.getRepository(UserEntity);

    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      logger.info('Users already exist, skipping seed');
      return;
    }

    const users = [
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1-555-0101',
        bio: 'Senior Software Engineer',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1-555-0102',
        bio: 'Product Manager',
        isActive: true,
        isEmailVerified: true,
      },
      {
        email: 'bob.wilson@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        phoneNumber: '+1-555-0103',
        bio: 'DevOps Engineer',
        isActive: true,
        isEmailVerified: false,
      },
      {
        email: 'alice.johnson@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        phoneNumber: '+1-555-0104',
        bio: 'Data Scientist',
        isActive: false,
        isEmailVerified: true,
      },
      {
        email: 'charlie.brown@example.com',
        firstName: 'Charlie',
        lastName: 'Brown',
        phoneNumber: '+1-555-0105',
        bio: 'Frontend Developer',
        isActive: true,
        isEmailVerified: true,
      },
    ];

    await userRepository.insert(users);
    logger.info(`Seeded ${users.length} users`);
  } catch (error) {
    logger.error('Failed to seed users', error as Error);
    throw error;
  }
}
