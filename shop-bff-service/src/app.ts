import { createAppServer } from './server'
import { initBus } from './bus'
import { registerWebClient } from './namespaces/webClient'
import { registerShopProjection } from './namespaces/shopProjection'

(async () => {
  const { io, server } = createAppServer()
  const bus = await initBus()

  const shopProjectionNs = io.of('/shop_projection')
  registerShopProjection(shopProjectionNs, io)
  registerWebClient(io, bus, shopProjectionNs)

  server.listen(4000, () =>
    console.log('🚀 [http+wss+pubsub] BFF listening on port 4000')
  )
})()
