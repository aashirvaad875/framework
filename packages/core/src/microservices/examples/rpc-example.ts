import { createMicroservice } from '../bootstrap/microservice.js';
import { RequestHandler } from '../bootstrap/microservice.decorator.js';
import { Injectable } from '../../decorators/index.js';

// Service A: User Service
@Injectable()
export class UserService {
  @RequestHandler('getUser')
  async getUser(payload: { id: string }) {
    return { id: payload.id, name: 'John Doe', email: 'john@example.com' };
  }
}

// Service B: Order Service
@Injectable()
export class OrderService {
  constructor(private rpcClient: Record<string, unknown>) {}

  async createOrder(customerId: string) {
    // Call User Service via RPC
    const user = await this.rpcClient.send({
      service: 'users',
      handler: 'getUser',
      payload: { id: customerId },
      timeout: 5000,
    });

    return {
      orderId: Math.random(),
      customer: user,
      total: 99.99,
    };
  }
}

// Bootstrap example
export async function exampleRPC() {
  // Start users service
  const usersService = await createMicroservice({
    transport: { transport: 'redis', host: 'localhost', port: 6379 },
    registry: { type: 'static', config: { users: 'localhost:5001' } },
    serviceName: 'users',
    port: 5001,
  });

  // Start orders service
  const ordersService = await createMicroservice({
    transport: { transport: 'redis', host: 'localhost', port: 6379 },
    registry: {
      type: 'static',
      config: { users: 'localhost:5001', orders: 'localhost:5002' },
    },
    serviceName: 'orders',
    port: 5002,
  });

  // Call order creation (which internally calls users service)
  const order = await new OrderService(ordersService.getRequestClient()).createOrder('user-123');
  // eslint-disable-next-line no-console
  console.log('Order created:', order);

  await usersService.shutdown();
  await ordersService.shutdown();
}
