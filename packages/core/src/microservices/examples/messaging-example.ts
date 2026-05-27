import { createMicroservice } from '../bootstrap/microservice.js';
import { MessageListener } from '../bootstrap/microservice.decorator.js';
import { Injectable } from '../../decorators/index.js';

// Event Publisher
@Injectable()
export class OrderEventPublisher {
  constructor(private messagePublisher: Record<string, unknown>) {}

  async publishOrderCreated(orderId: string, customerId: string) {
    await this.messagePublisher.publish({
      topic: 'order.created',
      payload: { orderId, customerId, timestamp: Date.now() },
    });
  }
}

// Event Subscriber
@Injectable()
export class NotificationService {
  @MessageListener('order.created')
  async onOrderCreated(event: { orderId: string; customerId: string }) {
    // eslint-disable-next-line no-console
    console.log(`Sending notification for order ${event.orderId} to customer ${event.customerId}`);
  }
}

// Bootstrap example
export async function exampleMessaging() {
  // Start order service (publisher)
  const orderService = await createMicroservice({
    transport: { transport: 'redis', host: 'localhost', port: 6379 },
    registry: { type: 'static', config: {} },
    serviceName: 'orders',
    port: 5002,
  });

  // Start notification service (subscriber)
  const notificationService = await createMicroservice({
    transport: { transport: 'redis', host: 'localhost', port: 6379 },
    registry: { type: 'static', config: {} },
    serviceName: 'notifications',
    port: 5003,
  });

  // Publish event
  const publisher = new OrderEventPublisher(orderService.getMessagePublisher());
  await publisher.publishOrderCreated('order-123', 'customer-456');

  // Subscriber listens automatically (via decorator)
  await new Promise(resolve => setTimeout(resolve, 1000));

  await orderService.shutdown();
  await notificationService.shutdown();
}
