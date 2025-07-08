import { Collection } from 'mongodb';

export interface OrderView {
  orderId: string;
  userId: string;
  total: number;
  status: string;
  correlationId?: string;
}

export class OrderRepository {
  constructor(private readonly collection: Collection<OrderView>) {}

  async save(view: OrderView): Promise<void> {
    await this.collection.insertOne(view);
  }

  async findByUserId(userId: string): Promise<OrderView[]> {
    return this.collection.find({ userId }).toArray();
  }
}
