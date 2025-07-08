import { Socket } from 'socket.io'

export function userAuth(socket: Socket, next: (err?: Error) => void) {
    const { userId } = socket.handshake.auth as { userId?: string }
    if (!userId) {
        console.error('❌ [bff-auth] Missing auth.userId')
        return next(new Error('auth error'))
    }
    socket.data.userId = userId
    console.log(`✅ [bff-auth] Accepted userId=${userId}`)
    next()
}

export function serviceAuth(socket: Socket, next: (err?: Error) => void) {
    const { serviceToken } = socket.handshake.auth as { serviceToken?: string }
    if (!serviceToken) {
        console.error('❌ [bff-auth] Missing auth.serviceToken')
        return next(new Error('auth error'))
    }
    socket.data.serviceId = serviceToken
    console.log(`✅ [bff-auth] Accepted serviceId=${serviceToken}`)
    next()
}
