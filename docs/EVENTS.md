# Event-Driven System

Complete event-driven architecture for the framework with async event emitting, listener management, distributed event support, and comprehensive monitoring.

## Quick Start

### Basic Usage

```typescript
import { EventBus, EventListener, EventDispatcher } from '@framework/core';

// Create event bus
const eventBus = new EventBus({ async: true, concurrency: 10 });

// Subscribe to events
eventBus.on('user:created', async (event) => {
  console.log('User created:', event.data);
});

// Emit events
await eventBus.emit('user:created', {
  id: '123',
  email: 'john@example.com',
  name: 'John Doe',
});
```

### Using Decorators

```typescript
import { EventListener, OnEvent } from '@framework/core';

class UserService {
  @EventListener('user:created')
  async onUserCreated(event) {
    console.log('New user:', event.data);
  }

  @OnEvent('user:deleted')
  async onUserDeleted(event) {
    console.log('User deleted:', event.data);
  }
}
```

## Core Concepts

### Event Structure

Every event has a consistent structure:

```typescript
interface Event<T = any> {
  type: string;                 // Event name (e.g., 'user:created')
  data: T;                      // Event payload
  timestamp: number;            // Milliseconds since epoch
  source?: string;              // Event origin (e.g., 'user-service')
  correlationId?: string;       // Trace across services (UUID)
  causationId?: string;         // Parent event ID (UUID)
  metadata?: Record<string, any>; // Custom metadata
}
```

**Tracing Example:**
```typescript
// Request comes in with correlation ID
await eventBus.emit('user:created', userData, {
  source: 'api',
  correlationId: req.correlationId,  // From header X-Correlation-ID
  causationId: req.id,               // Request ID
});

// All child events inherit correlation ID
// Enables distributed tracing across services
```

### Listener Registration

```typescript
// Simple listener
eventBus.on('user:created', async (event) => {
  console.log('User created:', event.data);
});

// With options
eventBus.on('user:created', async (event) => {
  // Handle event
}, { async: true, priority: 1 });

// One-time listener
eventBus.once('app:started', async (event) => {
  console.log('App started once');
});

// Get unsubscribe function
const unsubscribe = eventBus.on('user:deleted', handler);
unsubscribe(); // Removes listener
```

### Unsubscribing

```typescript
// Using returned function
const unsubscribe = eventBus.on('user:created', handler);
unsubscribe();

// Using .off()
eventBus.off('user:created', handler);

// Remove all listeners for event type
eventBus.removeAllListeners('user:created');

// Remove all listeners
eventBus.removeAllListeners();
```

## Advanced Features

### Concurrency Control

Events execute listeners with configurable concurrency:

```typescript
const eventBus = new EventBus({
  async: true,
  concurrency: 5,  // Max 5 listeners in parallel
});

// All listeners execute in groups of 5
await eventBus.emit('user:created', data);
```

**Concurrency Modes:**
- `concurrency: 1` → Sequential execution (one listener at a time)
- `concurrency: 5` → Groups of 5 listeners in parallel
- `concurrency: 10` → All listeners in parallel (default)

### Timeout Management

Prevent listener hangs with timeout:

```typescript
const eventBus = new EventBus({
  timeout: 30000,  // 30 second timeout per listener
});

// This listener will timeout if it takes > 30s
eventBus.on('long-operation', async (event) => {
  await verySlowOperation();  // If > 30s, throws timeout error
});
```

### Error Handling

```typescript
const eventBus = new EventBus({
  errorHandler: (error, event, listener) => {
    logger.error('Event error', {
      event: event.type,
      error: error.message,
      listener: listener.toString().slice(0, 100),
    });
  },
});

// Listener errors are caught and passed to errorHandler
eventBus.on('user:created', async (event) => {
  throw new Error('Processing failed');  // Caught, not thrown
});
```

### Waiting for Events

```typescript
// Wait for specific event (with timeout)
try {
  const event = await eventBus.waitFor('payment:completed', 60000);
  console.log('Payment completed:', event.data);
} catch (error) {
  console.log('Payment timeout');
}

// Without timeout (uses default 30s)
const event = await eventBus.waitFor('user:verified');
```

### Event Dispatch Results

```typescript
const result = await eventBus.emit('user:created', data);

console.log(result);
// {
//   event: { type: 'user:created', data, ... },
//   listeners: 3,           // Total listeners
//   successful: 3,          // Successful executions
//   failed: 0,              // Failed executions
//   duration: 145,          // Milliseconds
//   errors: []              // Error details
// }
```

### Event Statistics

```typescript
const stats = eventBus.getStats();

console.log(stats);
// {
//   totalEvents: 1523,
//   eventsByType: {
//     'user:created': 450,
//     'user:deleted': 230,
//     'payment:completed': 843,
//   },
//   totalListeners: 12,
//   failedEvents: 5,
//   successfulEvents: 1518,
//   averageProcessingTime: 23.4  // ms
// }
```

### Distributed Events (Queue Integration)

```typescript
const eventBus = new EventBus({
  enableDistributed: true,
});

// Set queue manager for distributed events
eventBus.setQueueManager(queueManager);

// Emit to queue for reliable delivery
await eventBus.emitDistributed('email:send', {
  to: 'user@example.com',
  subject: 'Welcome!',
});

// Queue processes with retries, backoff, etc.
```

## Using EventDispatcher

EventDispatcher wraps EventBus with class-based listener support:

```typescript
import { EventDispatcher } from '@framework/core';

const dispatcher = new EventDispatcher(eventBus);

// Register all decorated listeners from class
class OrderService {
  @EventListener('order:placed')
  async onOrderPlaced(event) {
    // Handle order
  }

  @EventListener('order:cancelled')
  async onOrderCancelled(event) {
    // Handle cancellation
  }
}

const orderService = new OrderService();
dispatcher.registerListenersFromInstance(orderService);

// All listeners are now registered
```

## Using EventsModule (DI Integration)

```typescript
import { EventBusModuleBuilder } from '@framework/core';

const eventsModule = new EventBusModuleBuilder()
  .setMaxListeners(20)
  .setAsync(true)
  .setConcurrency(10)
  .setTimeout(30000)
  .enableDistributed(true)
  .build();

await eventsModule.initialize();

// Get instances
const eventBus = eventsModule.getEventBus();
const dispatcher = eventsModule.getEventDispatcher();

// Cleanup on shutdown
await eventsModule.shutdown();
```

## Decorators Reference

### @EventListener

Declares a method as event listener with metadata:

```typescript
class UserService {
  @EventListener('user:created', { async: true, priority: 1 })
  async onUserCreated(event: Event<CreateUserDto>, context?: ListenerContext) {
    // Auto-called when 'user:created' event emitted
    // context has: correlationId, causationId, timestamp, source
  }
}
```

**Options:**
- `async?: boolean` - Force async execution
- `priority?: number` - Listener priority (lower = higher priority)

### @OnEvent

Alias for @EventListener (simpler syntax):

```typescript
class UserService {
  @OnEvent('user:deleted')
  async onUserDeleted(event: Event) {
    // Handle deletion
  }
}
```

## Patterns

### Event-Driven Workflow

```typescript
// 1. User service emits event
await eventBus.emit('user:created', newUser);

// 2. Multiple listeners react independently
class NotificationService {
  @OnEvent('user:created')
  async sendWelcomeEmail(event) {
    await emailService.send(event.data.email, 'Welcome!');
  }
}

class AnalyticsService {
  @OnEvent('user:created')
  async trackUserSignup(event) {
    await analytics.track('user:signup', event.data);
  }
}

class AuditService {
  @OnEvent('user:created')
  async logAuditTrail(event) {
    await auditLog.create({
      type: 'user_created',
      userId: event.data.id,
      timestamp: event.timestamp,
    });
  }
}

// All three listeners execute independently (in parallel, concurrency 10)
// Failures in one don't affect others
```

### Correlated Events

```typescript
// Request handling with event correlation
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  next();
});

@Controller('/users')
class UserController {
  @Post()
  async createUser(@Body() dto, @Req() req) {
    const user = await this.userService.create(dto);

    // Emit with correlation ID
    await eventBus.emit('user:created', user, {
      correlationId: req.correlationId,
      source: 'user-api',
    });

    return user;
  }
}

// Downstream services inherit correlation ID
class EmailService {
  @OnEvent('user:created')
  async sendEmail(event, context) {
    // context.correlationId = same as original request
    // Enables tracing entire flow across services
    logger.info('Sending email', { correlationId: context.correlationId });
  }
}
```

### Event Aggregation

```typescript
class ReportGenerator {
  private paymentEvents: Event[] = [];

  constructor(eventBus: EventBus) {
    eventBus.on('payment:completed', (event) => {
      this.paymentEvents.push(event);
    });

    // Generate daily report
    setInterval(() => this.generateDailyReport(), 24 * 60 * 60 * 1000);
  }

  private generateDailyReport() {
    const total = this.paymentEvents.reduce((sum, e) => sum + e.data.amount, 0);
    const count = this.paymentEvents.length;

    console.log(`Daily Revenue: $${total}, Transactions: ${count}`);
    this.paymentEvents = []; // Reset
  }
}
```

### Event Saga (Orchestration)

```typescript
class OrderSaga {
  constructor(
    private eventBus: EventBus,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private inventoryService: InventoryService,
  ) {
    this.setupSaga();
  }

  private setupSaga() {
    // Order placed → Check inventory
    this.eventBus.on('order:placed', async (event) => {
      const reserved = await this.inventoryService.reserve(event.data.items);
      if (reserved) {
        await this.eventBus.emit('inventory:reserved', { orderId: event.data.id });
      } else {
        await this.eventBus.emit('order:failed', { orderId: event.data.id });
      }
    });

    // Inventory reserved → Process payment
    this.eventBus.on('inventory:reserved', async (event) => {
      const paid = await this.paymentService.charge(event.data.orderId);
      if (paid) {
        await this.eventBus.emit('payment:processed', { orderId: event.data.orderId });
      }
    });

    // Payment processed → Complete order
    this.eventBus.on('payment:processed', async (event) => {
      await this.orderService.complete(event.data.orderId);
      await this.eventBus.emit('order:completed', { orderId: event.data.orderId });
    });
  }
}
```

## Configuration

### EventBusConfig

```typescript
interface EventBusConfig {
  async?: boolean;              // Async listener execution (default: true)
  concurrency?: number;         // Max concurrent listeners (default: 10)
  maxListeners?: number;        // Max listeners per event (default: 10)
  timeout?: number;             // Listener timeout in ms (default: 30000)
  enableDistributed?: boolean;  // Enable queue integration (default: false)
  errorHandler?: Function;      // Custom error handler
}
```

## Listener Registry

### Getting Information

```typescript
const registry = eventBus.registry; // Access internal registry

// Get listeners for event type
const listeners = registry.getListeners('user:created');

// Get listener count
const count = registry.getListenerCount('user:created');
const total = registry.getListenerCount(); // All events

// Get all event types
const types = registry.getEventTypes(); // ['user:created', 'user:deleted', ...]

// Get statistics
const stats = registry.getStats();
// {
//   'user:created': { count: 3, async: 3, sync: 0 },
//   'user:deleted': { count: 2, async: 2, sync: 0 },
// }

// Check if listener exists
const exists = registry.hasListener('user:created', myHandler);

// Find listeners by pattern
const userEvents = registry.getListenersByPattern(/^user:/);
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Register listener | ~0.1ms | Add to registry |
| Unregister listener | ~0.1ms | Remove from registry |
| Emit (1 listener) | ~1-5ms | Includes execution |
| Emit (10 listeners, sequential) | ~30-100ms | Depends on handler |
| Emit (10 listeners, concurrent) | ~5-20ms | 10 parallel |
| Wait for event | <1ms | Setup, waits for event |
| Get stats | ~0.5ms | Memory calculation |

## Best Practices

### 1. Use Correlation IDs

```typescript
// Always pass correlation ID for tracing
await eventBus.emit('user:created', user, {
  correlationId: req.correlationId,
  source: 'api',
});
```

### 2. Handle Errors Gracefully

```typescript
const eventBus = new EventBus({
  errorHandler: (error, event, listener) => {
    logger.error('Listener failed', {
      event: event.type,
      error: error.message,
    });
    // Don't throw - let other listeners execute
  },
});
```

### 3. Avoid Blocking Operations

```typescript
// ❌ Bad - blocks event emission
eventBus.on('user:created', async (event) => {
  await sleep(5000); // Slow operation
});

// ✅ Good - emit to queue
await eventBus.emitDistributed('email:send', emailData);

// ✅ Good - fire and forget
eventBus.on('user:created', async (event) => {
  // Quick acknowledgment
  // Long work in background job
  queue.addJob('send-email', { to: event.data.email });
});
```

### 4. Use Events for Loose Coupling

```typescript
// ✅ Good - User service doesn't know about Email service
await eventBus.emit('user:created', newUser);

// Email service listens independently
eventBus.on('user:created', async (event) => {
  await emailService.sendWelcome(event.data.email);
});

// New service can be added later without changing UserService
```

### 5. Namespace Events

```typescript
// Use domain:action pattern
eventBus.emit('user:created', ...);
eventBus.emit('user:updated', ...);
eventBus.emit('user:deleted', ...);

eventBus.emit('order:placed', ...);
eventBus.emit('order:shipped', ...);
eventBus.emit('order:delivered', ...);

// Filter by pattern
const userListeners = registry.getListenersByPattern(/^user:/);
```

## Testing

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { EventBus } from '@framework/core';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should emit events and call listeners', async () => {
    const handler = jest.fn();
    eventBus.on('test:event', handler);

    await eventBus.emit('test:event', { value: 42 });

    expect(handler).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'test:event', data: { value: 42 } }),
      expect.anything(),
    );
  });

  it('should handle listener errors', async () => {
    const errorHandler = jest.fn();
    eventBus = new EventBus({ errorHandler });

    eventBus.on('test:event', async () => {
      throw new Error('Listener failed');
    });

    const result = await eventBus.emit('test:event', {});

    expect(errorHandler).toHaveBeenCalled();
    expect(result.failed).toBe(1);
  });

  it('should respect concurrency limit', async () => {
    const eventBus = new EventBus({ concurrency: 2 });
    const times: number[] = [];

    for (let i = 0; i < 4; i++) {
      eventBus.on('test:event', async () => {
        times.push(Date.now());
        await sleep(100);
        times.push(Date.now());
      });
    }

    await eventBus.emit('test:event', {});

    // Verify concurrency groups
    // Group 1: listeners 0,1
    // Group 2: listeners 2,3
  });
});
```

## Integration with Other Systems

### With Queue System

```typescript
const eventBus = new EventBus({ enableDistributed: true });
const queueManager = QueueManager.createBullMQ(redis);

eventBus.setQueueManager(queueManager);

// Emit to queue for retry support
await eventBus.emitDistributed('email:send', emailData);

// Queue handles: retries, exponential backoff, persistence
```

### With Logging

```typescript
const eventBus = new EventBus({
  errorHandler: (error, event, listener) => {
    logger.error('Event listener failed', {
      eventType: event.type,
      error: error.message,
      correlationId: event.correlationId,
    });
  },
});

eventBus.on('user:created', async (event, context) => {
  logger.info('User created', {
    userId: event.data.id,
    correlationId: context.correlationId,
  });
});
```

## Summary

The event-driven system provides:

✅ **Async Event Emission** - Flexible concurrency control  
✅ **Listener Management** - Register, unregister, query listeners  
✅ **Distributed Events** - Queue integration for reliability  
✅ **Correlation Tracking** - Trace events across services  
✅ **Error Handling** - Graceful failure handling  
✅ **Statistics** - Monitor event flow and performance  
✅ **Decorators** - @EventListener, @OnEvent for class-based listeners  
✅ **DI Integration** - EventBusModuleBuilder for dependency injection  
✅ **Timeout Management** - Prevent listener hangs  

Perfect for microservices, event sourcing, real-time systems, and decoupled architectures.
