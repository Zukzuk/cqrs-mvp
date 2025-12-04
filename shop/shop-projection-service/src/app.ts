import express from 'express'
import http from 'http'
import { MongoClient } from 'mongodb'
import { io as Client } from 'socket.io-client'
import { RabbitMQBroker } from '@daveloper/broker'
import { startMetricsServer } from '@daveloper/opentelemetry'
import { TOrderEventUnion, TShopOrdersDocument } from '@daveloper/interfaces'
import { OrderHandler } from './handler'
import { OrderRepository } from './repository'

(async () => {
  // Start OpenTelemetry metrics server
  startMetricsServer(Number(process.env.OTEL_METRICS_PORT) || 9100)

  // Setup MongoDB
  const mongoClient = new MongoClient(process.env.MONGO_URL!)
  await mongoClient.connect()
  const db = mongoClient.db('shop_projection')
  const ordersCol = db.collection<TShopOrdersDocument>('orders')
  const orderRepo = new OrderRepository(ordersCol)

  // Setup Socket.IO client to BFF
  const socket = Client('http://shop-bff-service:3000/shop_projection', {
    transports: ['websocket'],
    auth: { serviceId: 'service123' },
  });

  // Notify BFF when connected
  socket.on('connect', () => {
    socket.emit('shop_projection_ready')
  })

  // Answer snapshot queries from BFF
  socket.on('request_orders_snapshot', async ({ userId }) => {
    const orders = await orderRepo.findByUserId(userId)
    socket.emit('orders_snapshot', { userId, orders })
  })
  
  // Setup RabbitMQ broker
  const broker = new RabbitMQBroker(process.env.BROKER_URL!)
  await broker.init()

  // Setup projection handlers  
  const orderHandler = new OrderHandler(orderRepo, socket)

  // Subscribe to order events
  await broker.subscribe<TOrderEventUnion>(
    async (evt) => orderHandler.handle(evt),
    {
      queue: 'shop-projection-q', exchange: 'domain-events', durable: true, autoDelete: false,
      routingKeys: ['OrderCreated', 'OrderShipped'],
    }
  )

  // Start basic HTTP server for health checks
  const app = express()
  const server = http.createServer(app)
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))
  server.listen(3002, () => console.log('🚀 ShopProjectionService up'))
})()