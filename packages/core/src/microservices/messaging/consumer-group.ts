export interface ConsumerInstance {
  instanceId: string;
  partitions: string[];
}

export class ConsumerGroup {
  private instances: Map<string, ConsumerInstance> = new Map();
  private partitions: Set<string> = new Set();
  private rebalanceCallbacks: Set<() => Promise<void>> = new Set();

  constructor(
    private groupId: string,
    private topicPartitionCount: number = 1
  ) {
    for (let i = 0; i < topicPartitionCount; i++) {
      this.partitions.add(`partition-${i}`);
    }
  }

  registerInstance(instanceId: string): void {
    this.instances.set(instanceId, {
      instanceId,
      partitions: [],
    });
    this.rebalance();
  }

  deregisterInstance(instanceId: string): void {
    this.instances.delete(instanceId);
    if (this.instances.size > 0) {
      this.rebalance();
    }
  }

  private rebalance(): void {
    const instances = Array.from(this.instances.values());
    const partitionArray = Array.from(this.partitions);

    instances.forEach(inst => {
      inst.partitions = [];
    });

    partitionArray.forEach((partition, index) => {
      const instanceIndex = index % instances.length;
      instances[instanceIndex].partitions.push(partition);
    });
  }

  getPartitionsForInstance(instanceId: string): string[] {
    const instance = this.instances.get(instanceId);
    return instance ? instance.partitions : [];
  }

  onRebalance(callback: () => Promise<void>): void {
    this.rebalanceCallbacks.add(callback);
  }

  getInstanceCount(): number {
    return this.instances.size;
  }
}
