import express from 'express'
import http from 'http'
import { MongoClient } from 'mongodb'
import { io as Client } from 'socket.io-client'
import { RabbitMQBroker } from '@daveloper/broker'
import { startMetricsServer } from '@daveloper/opentelemetry'
import { CalendarDenormalizer, OrderDenormalizer } from './denormalizer'
import { CalendarRepository, OrderRepository } from './repository'
import { TOrderEventUnion, TCalendarEventUnion, ShopOrdersDocument, CalendarDocument } from '@daveloper/interfaces'

(async () => {
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100)

  const mongoClient = new MongoClient(process.env.MONGO_URL!)
  await mongoClient.connect()
  const db = mongoClient.db('shop_projection')
  const ordersCol = db.collection<ShopOrdersDocument>('orders')
  const calendarsCol = db.collection<CalendarDocument>('calendars')
  const orderRepo = new OrderRepository(ordersCol)
  const calendarRepo = new CalendarRepository(calendarsCol)

  const socket = Client('http://shop-bff-service:3000/shop_projection', {
    transports: ['websocket'],
    auth: { serviceId: 'service123' },
  })

  const orderDenorm = new OrderDenormalizer(orderRepo, socket)
  const calendarDenorm = new CalendarDenormalizer(calendarRepo, socket)

  const broker = new RabbitMQBroker(process.env.BROKER_URL!)
  await broker.init()

  // Subscribe to ORDER events
  await broker.subscribe<TOrderEventUnion>(
    async (evt) => orderDenorm.handle(evt),
    { queue: 'shop-projection-q', exchange: 'domain-events', routingKeys: ['OrderCreated', 'OrderShipped'], durable: true, autoDelete: false }
  )

  // Subscribe to CALENDAR events
  await broker.subscribe<TCalendarEventUnion>(
    async (evt) => calendarDenorm.handle(evt),
    { queue: 'shop-calendar-projection-q', exchange: 'domain-events', routingKeys: ['CalendarCreated', 'TimeslotScheduled', 'TimeslotRescheduled', 'ScheduledTimeslotRemoved', 'CalendarRemoved'], durable: true, autoDelete: false }
  )

  // Answer snapshot queries from BFF
  socket.on('request_orders_snapshot', async ({ userId }) => {
    const orders = await orderRepo.findByUserId(userId)
    socket.emit('orders_snapshot', { userId, orders })
  })

  socket.on('request_calendars_snapshot', async ({ userId }) => {
    const calendar = await calendarRepo.findByUserId(userId)
    if (!calendar) {
      // Create on demand so first command isn't required from UI
      socket.emit('calendars_snapshot', { userId, calendar: { calendarId: userId, userId, timeslots: [] } })
      return
    }
    socket.emit('calendars_snapshot', { userId, calendar })
  })

  const app = express()
  const server = http.createServer(app)
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
  server.listen(3002, () => console.log('🚀 ShopProjectionService up'))
})()