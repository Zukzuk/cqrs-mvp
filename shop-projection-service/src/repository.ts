import { Collection } from 'mongodb';
import { IShopView } from '@daveloper/interfaces';

export class OrderRepository {
  constructor(private readonly collection: Collection<IShopView>) {}

  // Upsert an OrderView into the collection
  async save(view: IShopView): Promise<void> {
    await this.collection.updateOne(
      { orderId: view.orderId },
      { $set: view },
      { upsert: true }
    );
  }

  async findByUserId(userId: string): Promise<IShopView[]> {
    return this.collection.find({ userId }).toArray();
  }
}
