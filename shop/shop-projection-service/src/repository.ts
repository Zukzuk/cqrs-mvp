import { Collection } from 'mongodb';
import { TCalendarDocument, TShopOrdersDocument, TTimeslot } from '@daveloper/interfaces';

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

export class CalendarRepository {
  constructor(private readonly coll: Collection<TCalendarDocument>) {}

  async upsert(doc: TCalendarDocument) {
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
