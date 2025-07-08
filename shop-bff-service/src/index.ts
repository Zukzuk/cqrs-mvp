import { createAppServer } from './server'
import { initBus } from './bus'
import { registerWebClient } from './namespaces/webClient'
import { registerProjection } from './namespaces/projection'

  ; (async () => {
    const { io, server } = createAppServer()
    const bus = await initBus()

    const projectionNs = io.of('/order_projection')
    registerProjection(projectionNs, io)
    registerWebClient(io, bus, projectionNs)

    server.listen(4000, () =>
      console.log('🚀 [http+wss+pubsub] BFF listening on port 4000')
    )
  })()
