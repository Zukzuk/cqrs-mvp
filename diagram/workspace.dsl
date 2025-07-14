workspace {
  model "cqrs-mvp" {
    properties {
      structurizr.groupSeparator "::"
    }

    shop = softwareSystem "CQRS-ES System (MVP)" {

      group ".Event Platform" {
        broker_service = container "Broker" "Provides a robust messaging broker with management UI" "RabbitMQ [5672,15672]" {
          tags "Broker"
        }
      }

      group ".Order Domain" {
        order_service = container "Order Application" "Subscribes to certain Commands, protects the DomainLogic, emits DomainEvents to the broker" "Node.js, Express [4000]"

        group ".Event Store" {
          order_eventstore_service = container "Order EventStore" "Durable, append-only event journal" "Node.js, Express [4001]"
          order_eventstore_db = container "Order EventStore Database" "Append only journal for DomainEvents" "MongoDB [default]"" {
            tags "Database"
          }
        }
      }

      group ".Shop" {
        shop_bff_service = container "Shop BFF" "Exposes and guards WebSocket/APIs, publishes Commands to the broker, forwards Queries to projections, listens for Payloads from projections and forwards them to web clients" "Node.js, Express, Socket.io [3000]"

        group ".Website" {
          shop_webserver = container "Shop Frontend SPA" "Web interface, connects to bff via wss, sends Queries and Commands to bff, renders incoming Payloads" "Browser, Socket.io.min" {
            tags "Webclient"
          }
          shop_webserver_server = container "Shop Frontend Server" "Serves static files" "Nginx [3001]"
          shop_webserver_user = container "User" "End user interacting via browser" "Person" {
            tags "Person"
          }
          shop_webserver_server -> shop_webserver "serves"
          shop_webserver_user -> shop_webserver "uses"
        }

        group ".Projection" {
          shop_projection_service = container "Shop Projection" "Handles fetches, subscribes to DomainEvents, denormalizes and upserts Payloads, pushes Payloads to bff" "Node.js, Express, Socket.io-client [3002]"
          shop_projection_db = container "Shop Projection Database" "Read DB for denormalized views" "Node.js, MongoDB [default]"" {
            tags "Database"
          }
        }
      }


      order_service -> broker_service "subscribe to certain Commands, publish DomainEvents"
      order_service -> order_eventstore_service "fetch streams, commit DomainEvents"
      order_eventstore_service -> order_eventstore_db "read, write"
      shop_bff_service -> broker_service "publish Commands"
      shop_webserver -> shop_bff_service "send Commands and Queries, listen for Payloads"
      shop_projection_service -> broker_service "subscribe to certain DomainEvents"
      shop_projection_service -> shop_bff_service "listen for Queries and push Payloads"
      shop_projection_service -> shop_projection_db "fetch data, upsert data"
      shop_projection_db -> order_eventstore_service "seed script via fetch streams"
    }
  }

  views {
    container shop container_view "Container Diagram" {
      include *
    }
    styles {
      element * {
        shape roundedbox
        background "royalblue"
      }
      element "Broker" {
        shape hexagon
        background "tomato"
      }
      element "Database" {
        shape cylinder
        background "orchid"
      }
      element "Webclient" {
        shape webbrowser
        background "seagreen"
      }
      element "Person" {
        background "seagreen"
      }
    }
    theme default
  }
}
