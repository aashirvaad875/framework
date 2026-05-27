/**
 * Event-Driven System Examples
 * Demonstrates 12 practical event system use cases
 */

import {
  EventBus,
  EventDispatcher,
  EventListener,
  OnEvent,
  EventsModule,
  EventBusModuleBuilder,
  getGlobalEventBus,
} from '@framework/core';

// ============================================================================
// Example 1: Basic Event Emission and Listening
// ============================================================================

async function example1BasicEmit() {
  console.log('\n=== Example 1: Basic Event Emission ===');

  const eventBus = new EventBus();

  // Subscribe to event
  eventBus.on('user:created', async (event) => {
    console.log('User created:', event.data.name);
  });

  // Emit event
  await eventBus.emit('user:created', {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  });
}

// ============================================================================
// Example 2: Multiple Listeners (Pub/Sub Pattern)
// ============================================================================

async function example2MultipleListeners() {
  console.log('\n=== Example 2: Multiple Listeners ===');

  const eventBus = new EventBus();

  // Listener 1: Send email
  eventBus.on('user:created', async (event) => {
    console.log('📧 Sending welcome email to:', event.data.email);
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log('✓ Email sent');
  });

  // Listener 2: Log to analytics
  eventBus.on('user:created', async (event) => {
    console.log('📊 Recording signup in analytics');
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log('✓ Analytics recorded');
  });

  // Listener 3: Create user profile
  eventBus.on('user:created', async (event) => {
    console.log('👤 Creating user profile');
    await new Promise((resolve) => setTimeout(resolve, 75));
    console.log('✓ Profile created');
  });

  // All listeners execute in parallel
  const startTime = Date.now();
  await eventBus.emit('user:created', {
    id: '1',
    name: 'Jane Smith',
    email: 'jane@example.com',
  });
  console.log(`Completed in ${Date.now() - startTime}ms`);
}

// ============================================================================
// Example 3: Event Subscription and Unsubscription
// ============================================================================

async function example3Unsubscribe() {
  console.log('\n=== Example 3: Unsubscribe ===');

  const eventBus = new EventBus();

  const handler = async (event) => {
    console.log('Handler called with:', event.data.id);
  };

  // Subscribe
  const unsubscribe = eventBus.on('order:placed', handler);

  // First emit - handler is called
  await eventBus.emit('order:placed', { id: 'order-1' });

  // Unsubscribe
  unsubscribe();
  console.log('Unsubscribed');

  // Second emit - handler is NOT called
  await eventBus.emit('order:placed', { id: 'order-2' });

  console.log('Handler not called on second emit');
}

// ============================================================================
// Example 4: Once - One-Time Listener
// ============================================================================

async function example4Once() {
  console.log('\n=== Example 4: One-Time Listener (once) ===');

  const eventBus = new EventBus();

  // This listener will only be called once
  eventBus.once('app:initialized', async (event) => {
    console.log('App initialized! This only runs once.');
  });

  // First emit - listener is called
  await eventBus.emit('app:initialized', { timestamp: Date.now() });

  // Second emit - listener is NOT called (already removed)
  await eventBus.emit('app:initialized', { timestamp: Date.now() });

  console.log('Second emit did not trigger listener');
}

// ============================================================================
// Example 5: Concurrency Control
// ============================================================================

async function example5Concurrency() {
  console.log('\n=== Example 5: Concurrency Control ===');

  const eventBus = new EventBus({
    async: true,
    concurrency: 2, // Only 2 listeners in parallel
  });

  // Add 4 listeners
  for (let i = 1; i <= 4; i++) {
    eventBus.on('process:task', async (event) => {
      console.log(`Listener ${i} starting`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`Listener ${i} done`);
    });
  }

  // With concurrency: 2, listeners 1&2 run in parallel, then 3&4
  const startTime = Date.now();
  await eventBus.emit('process:task', { id: 'task-1' });
  console.log(`Completed in ${Date.now() - startTime}ms (expected ~200ms)`);
}

// ============================================================================
// Example 6: Error Handling
// ============================================================================

async function example6ErrorHandling() {
  console.log('\n=== Example 6: Error Handling ===');

  const errors: any[] = [];
  const eventBus = new EventBus({
    errorHandler: (error, event, listener) => {
      console.log('⚠️ Error caught:', error.message);
      errors.push({ error: error.message, event: event.type });
    },
  });

  // Working listener
  eventBus.on('payment:process', async (event) => {
    console.log('✓ Processing payment:', event.data.amount);
  });

  // Failing listener
  eventBus.on('payment:process', async (event) => {
    throw new Error('Payment gateway timeout');
  });

  // Another working listener
  eventBus.on('payment:process', async (event) => {
    console.log('✓ Logging payment to audit trail');
  });

  const result = await eventBus.emit('payment:process', {
    id: 'pay-1',
    amount: 99.99,
  });

  console.log(`Result: ${result.successful} successful, ${result.failed} failed`);
}

// ============================================================================
// Example 7: Timeout Management
// ============================================================================

async function example7Timeout() {
  console.log('\n=== Example 7: Timeout Management ===');

  const eventBus = new EventBus({ timeout: 1000 }); // 1 second timeout

  // Quick handler (succeeds)
  eventBus.on('task:execute', async (event) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('✓ Quick handler completed');
  });

  // Slow handler (exceeds timeout)
  eventBus.on('task:execute', async (event) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('This will not log');
  });

  const result = await eventBus.emit('task:execute', { id: 'task-1' });
  console.log(`Result: ${result.successful} successful, ${result.failed} failed`);
}

// ============================================================================
// Example 8: Waiting for Events
// ============================================================================

async function example8WaitForEvent() {
  console.log('\n=== Example 8: Waiting for Events ===');

  const eventBus = new EventBus();

  // Simulate async operation
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('Emitting payment:completed event');
    await eventBus.emit('payment:completed', { id: 'pay-1', status: 'success' });
  })();

  // Wait for event
  console.log('Waiting for payment to complete...');
  try {
    const event = await eventBus.waitFor('payment:completed', 3000);
    console.log('✓ Payment completed:', event.data.status);
  } catch (error) {
    console.log('✗ Payment timeout');
  }
}

// ============================================================================
// Example 9: Using Decorators with EventDispatcher
// ============================================================================

async function example9Decorators() {
  console.log('\n=== Example 9: Decorators with EventDispatcher ===');

  const eventBus = new EventBus();
  const dispatcher = new EventDispatcher(eventBus);

  class NotificationService {
    @EventListener('email:send')
    async onSendEmail(event) {
      console.log(`📧 Sending email to ${event.data.to}`);
    }

    @OnEvent('sms:send')
    async onSendSms(event) {
      console.log(`📱 Sending SMS to ${event.data.phone}`);
    }
  }

  const service = new NotificationService();
  dispatcher.registerListenersFromInstance(service);

  // Emit events
  await eventBus.emit('email:send', { to: 'john@example.com', subject: 'Hello' });
  await eventBus.emit('sms:send', { phone: '+1234567890', message: 'Hi!' });
}

// ============================================================================
// Example 10: Event Statistics and Monitoring
// ============================================================================

async function example10Statistics() {
  console.log('\n=== Example 10: Event Statistics ===');

  const eventBus = new EventBus();

  // Add listeners
  eventBus.on('user:created', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  eventBus.on('user:created', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  eventBus.on('user:deleted', async () => {});

  // Emit events
  await eventBus.emit('user:created', { id: '1', name: 'User 1' });
  await eventBus.emit('user:created', { id: '2', name: 'User 2' });
  await eventBus.emit('user:deleted', { id: '1' });

  // Get statistics
  const stats = eventBus.getStats();
  console.log('Event Statistics:');
  console.log('  Total events:', stats.totalEvents);
  console.log('  Total listeners:', stats.totalListeners);
  console.log('  Successful events:', stats.successfulEvents);
  console.log('  Failed events:', stats.failedEvents);
  console.log('  Average processing time:', stats.averageProcessingTime.toFixed(2), 'ms');
  console.log('  Events by type:', stats.eventsByType);
}

// ============================================================================
// Example 11: Correlation IDs for Tracing
// ============================================================================

async function example11CorrelationIds() {
  console.log('\n=== Example 11: Correlation IDs ===');

  const eventBus = new EventBus();
  const { v4: uuidv4 } = await import('uuid');

  // Simulate request with correlation ID
  const correlationId = uuidv4();
  console.log('Request correlation ID:', correlationId);

  eventBus.on('user:created', async (event, context) => {
    console.log('Service A received event with correlation:', context.correlationId);
  });

  eventBus.on('user:created', async (event, context) => {
    console.log('Service B received event with correlation:', context.correlationId);
  });

  // Emit with correlation ID
  await eventBus.emit('user:created', { id: '1', name: 'John' }, {
    correlationId: correlationId,
    source: 'api-gateway',
  });
}

// ============================================================================
// Example 12: Using EventsModule with DI
// ============================================================================

async function example12EventsModule() {
  console.log('\n=== Example 12: EventsModule with DI ===');

  const eventsModule = new EventBusModuleBuilder()
    .setMaxListeners(15)
    .setAsync(true)
    .setConcurrency(5)
    .setTimeout(10000)
    .build();

  // Get instances
  const eventBus = eventsModule.getEventBus();
  const dispatcher = eventsModule.getEventDispatcher();

  // Use normally
  eventBus.on('app:ready', async (event) => {
    console.log('✓ App is ready!');
  });

  await eventBus.emit('app:ready', { timestamp: Date.now() });

  // Cleanup
  await eventsModule.shutdown();
  console.log('✓ EventsModule shut down');
}

// ============================================================================
// Run Examples
// ============================================================================

async function runAllExamples() {
  await example1BasicEmit();
  await example2MultipleListeners();
  await example3Unsubscribe();
  await example4Once();
  await example5Concurrency();
  await example6ErrorHandling();
  await example7Timeout();
  await example8WaitForEvent();
  await example9Decorators();
  await example10Statistics();
  await example11CorrelationIds();
  await example12EventsModule();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}

export {
  example1BasicEmit,
  example2MultipleListeners,
  example3Unsubscribe,
  example4Once,
  example5Concurrency,
  example6ErrorHandling,
  example7Timeout,
  example8WaitForEvent,
  example9Decorators,
  example10Statistics,
  example11CorrelationIds,
  example12EventsModule,
};
