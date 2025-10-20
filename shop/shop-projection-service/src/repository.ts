import { Collection } from 'mongodb';
import { CalendarDocument, ShopOrdersDocument, TTimeslot } from '@daveloper/interfaces';

export class OrderRepository {
  constructor(private readonly collection: Collection<ShopOrdersDocument>) {}

  // Upsert an OrderView into the collection
  async save(view: ShopOrdersDocument): Promise<void> {
    await this.collection.updateOne(
      { orderId: view.orderId },
      { $set: view },
      { upsert: true }
    );
  }

  async findByUserId(userId: string): Promise<ShopOrdersDocument[]> {
    return this.collection.find({ userId }).toArray();
  }
}

export class CalendarRepository {
  constructor(private readonly coll: Collection<CalendarDocument>) {}

  async upsert(doc: CalendarDocument) {
    await this.coll.updateOne({ calendarId: doc.calendarId }, { $set: doc }, { upsert: true })
  }

  async addOrUpdateTimeslot(calendarId: string, t: TTimeslot) {
    await this.coll.updateOne(
      { calendarId },
      { $set: { updatedAt: new Date().toISOString() }, $pull: { timeslots: { timeslotId: t.timeslotId } } }
    )
    await this.coll.updateOne(
      { calendarId },
      { $push: { timeslots: t }, $set: { updatedAt: new Date().toISOString() } },
      { upsert: true }
    )
  }

  async removeTimeslot(calendarId: string, timeslotId: string) {
    await this.coll.updateOne(
      { calendarId },
      { $pull: { timeslots: { timeslotId } }, $set: { updatedAt: new Date().toISOString() } }
    )
  }

  async findByUserId(userId: string) {
    return this.coll.findOne({ userId })
  }
}
