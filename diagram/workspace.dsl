workspace {
  model "cqrs-mvp" {
    properties {
      structurizr.groupSeparator "::"
    }

    shop = softwareSystem "CQRS-ES System (MVP)" {

      group ".Event Platform" {
        broker_service = container "Broker" "Provides a robust messaging broker with management UI" "RabbitMQ [5672,4672]" {
          tags "Broker"
        }
      }

      group ".Observability" {
        grafana = container "Grafana" "Dashboards en trace/metrics Explore" "Grafana [8300]"" {
          tags "Observability"
        }
        otel_collector = container "OpenTelemetry Collector" "Recieve OTLP (traces/metrics) and export to Tempo/Prometheus" "OpenTelemetry Collector [8317,8318,9464]"" {
          tags "Observability"
        }
        prometheus = container "Prometheus" "Scrape metrics van OTel Collector en RabbitMQ Exporter" "Prometheus [8900]"" {
          tags "Observability"
        }
        tempo = container "Tempo" "Opslag voor traces (OpenTelemetry)" "Grafana Tempo [8200]"" {
          tags "Observability"
        }
      }

      group ".Order Domain" {
        otel_inject_order_domain = container "Otel Order Domain" "Catch OTLP and send data to Otel Collector" "Code injection" {
          tags "Injector"
        }
        otel_inject_order_domain -> otel_collector "report metrics and traces"

        order_service = container "Order Application" "Subscribes to certain Commands, protects the DomainLogic, emits DomainEvents to the broker" "Node.js, Express [4000]"

        group ".Event Store" {
          order_eventstore_db = container "Order EventStore Database" "Append only journal for DomainEvents" "MongoDB [default]"" {
            tags "Database"
          }
          order_eventstore_service = container "Order EventStore" "Durable, append-only event journal" "Node.js, Express [4001]"
        }
      }

      group ".Shop" {
        otel_inject_shop = container "Otel Shop" "Catch OTLP and send data to Otel Collector" "Code injection" {
          tags "Injector"
        }
        otel_inject_shop -> otel_collector "report metrics and traces"

        shop_bff_service = container "Shop BFF" "Exposes and guards WebSocket/APIs, publishes Commands to the broker, forwards Queries to projections, listens for Payloads from projections and forwards them to web clients" "Node.js, Express, Socket.io [3000]"

        group ".Projection" {
          shop_projection_db = container "Shop Projection Database" "Read DB for denormalized views" "Node.js, MongoDB [default]"" {
            tags "Database"
          }
          shop_projection_service = container "Shop Projection" "Handles fetches, subscribes to DomainEvents, denormalizes and upserts Payloads, pushes Payloads to bff" "Node.js, Express, Socket.io-client [3002]"
        }

        group ".Website" {
          shop_webserver = container "Shop Frontend SPA" "Web interface, connects to bff via wss, sends Queries and Commands to bff, renders incoming Payloads" "Browser, Socket.io.min [URL]" {
            tags "Webclient"
          }
          shop_webserver_server = container "Shop Frontend Server" "Serves static files" "Nginx [3001]"
          shop_webserver_user = container "User" "End user interacting via browser" "Person" {
            tags "Person"
          }
          shop_webserver_server -> shop_webserver "serves"
          shop_webserver_user -> shop_webserver "uses"
        }
      }


      grafana -> prometheus "get metrics"
      grafana -> tempo "explore traces"
      order_eventstore_service -> order_eventstore_db "read, write"
      order_service -> broker_service "subscribe to certain Commands, publish DomainEvents"
      order_service -> order_eventstore_service "fetch streams, commit DomainEvents"
      otel_collector -> tempo "export traces"
      prometheus -> broker_service "scrape metrics and traces"
      prometheus -> otel_collector "get metrics"
      shop_bff_service -> broker_service "publish Commands"
      shop_projection_db -> order_eventstore_service "seed script via fetch streams"
      shop_projection_service -> broker_service "subscribe to certain DomainEvents"
      shop_projection_service -> shop_bff_service "listen for Queries and push Payloads"
      shop_projection_service -> shop_projection_db "fetch data, upsert data"
      shop_webserver -> shop_bff_service "send Commands and Queries, listen for Payloads"
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
      element "Injector" {
        shape ellipse
        background "black"
      }
      element "Observability" {
        shape roundedbox
        background "darkorange"
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
