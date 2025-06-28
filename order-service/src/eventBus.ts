import { Channel } from 'amqplib';
import { DomainEvent } from './events';
export class EventBus {
  constructor(private channel: Channel) {}
  async publish(event: DomainEvent) {
    await this.channel.assertQueue('events');
    console.log("publish events", event)
    this.channel.sendToQueue('events', Buffer.from(JSON.stringify(event)));
  }
}