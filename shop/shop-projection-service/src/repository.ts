import { Collection } from 'mongodb';
import { TShopOrdersDocument, TTimeslot } from '@daveloper/interfaces';

export class OrderRepository {
  constructor(private readonly collection: Collection<TShopOrdersDocument>) {}

  // Upsert an OrderView into the collection
  async save(view: TShopOrdersDocument): Promise<void> {
    await this.collection.updateOne(
      { orderId: view.orderId },
      { $set: view },
      { upsert: true }
    );
  }

  async findByUserId(userId: string): Promise<TShopOrdersDocument[]> {
    return this.collection.find({ userId }).toArray();
  }
}