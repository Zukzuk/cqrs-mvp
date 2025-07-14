import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server } from 'socket.io'

export function createAppServer() {
    const app = express()
    app.use(cors({ origin: 'http://localhost:3001', credentials: true }))
    app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }))

    const server = http.createServer(app)
    const io = new Server(server, {
        cors: { origin: 'http://localhost:3001', credentials: true },
        transports: ['polling', 'websocket']
    })

    return { app, server, io }
}
