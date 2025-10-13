workspace {
  model "cqrs-mvp" {
    properties {
      structurizr.groupSeparator "::"
    }

    sys_Event_Platform = softwareSystem "Event Platform" {
        broker_service = container "Broker" "Provides a robust messaging broker with management UI" "RabbitMQ [4672]" {
          tags "Broker"
          tags "Group:Event Platform"
          tags "GroupPath:Event Platform"
        }
    }
    sys_Calendar_Domain = softwareSystem "Calendar Domain" {
        calendar_service = container "Calendar Application" "Subscribes to certain Commands, protects the DomainLogic, emits DomainEvents to the broker" "Node.js, Express [4010]" {
          tags "Group:Calendar Domain"
          tags "GroupPath:Calendar Domain"
        }

        group ".Event Store" {
          calendar_eventstore_db = container "Calendar EventStore Database" "Append only journal for DomainEvents" "MongoDB [default]" {
            tags "Database"
            tags "Group:Calendar Domain"
            tags "Group:Event Store"
            tags "GroupPath:Calendar Domain/Event Store"
          }
          calendar_eventstore_service = container "Calendar EventStore" "Durable, append-only event journal" "Node.js, Express [4011]" {
            tags "Group:Calendar Domain"
            tags "Group:Event Store"
            tags "GroupPath:Calendar Domain/Event Store"
          }
        }
    }
    sys_Order_Domain = softwareSystem "Order Domain" {
        order_service = container "Order Application" "Subscribes to certain Commands, protects the DomainLogic, emits DomainEvents to the broker" "Node.js, Express [4000]" {
          tags "Group:Order Domain"
          tags "GroupPath:Order Domain"
        }

        group ".Event Store" {
          order_eventstore_db = container "Order EventStore Database" "Append only journal for DomainEvents" "MongoDB [default]" {
            tags "Database"
            tags "Group:Order Domain"
            tags "Group:Event Store"
            tags "GroupPath:Order Domain/Event Store"
          }
          order_eventstore_service = container "Order EventStore" "Durable, append-only event journal" "Node.js, Express [4001]" {
            tags "Group:Order Domain"
            tags "Group:Event Store"
            tags "GroupPath:Order Domain/Event Store"
          }
        }
    }
    sys_Observability = softwareSystem "Observability" {
        otel_collector = container "OTel Collector" "Recieve OTLP and save and/or expose it" "OpenTelemetry Collector [9464]" {
          tags "Observability"
          tags "Group:Observability"
          tags "GroupPath:Observability"
        }
        otel_grafana = container "Grafana" "Dashboards and explore traces and metrics" "Grafana [8300]" {
          tags "Observability"
          tags "Group:Observability"
          tags "GroupPath:Observability"
        }
        otel_grafana_user = container "Grafana_User" "End user interacting via browser" "Person" {
          tags "PersonObservability"
          tags "Group:Observability"
          tags "GroupPath:Observability"
        }
        otel_grafana_user -> otel_grafana "uses"
        otel_prometheus = container "Prometheus" "Scrape data from OTel sdk en RabbitMQ" "Prometheus [8900]" {
          tags "Observability"
          tags "Group:Observability"
          tags "GroupPath:Observability"
        }
        otel_prometheus_user = container "Prometheus_User" "End user interacting via browser" "Person" {
          tags "PersonObservability"
          tags "Group:Observability"
          tags "GroupPath:Observability"
        }
        otel_prometheus_user -> otel_prometheus "uses"
        otel_tempo = container "Tempo" "Persistance for traces" "Grafana Tempo [8200]" {
          tags "DatabaseObservability"
          tags "Group:Observability"
          tags "GroupPath:Observability"
        }
    }
    sys_Shop = softwareSystem "Shop" {
        shop_bff_service = container "Shop BFF" "Exposes and guards WebSocket/APIs, publishes Commands to the broker, forwards Queries to projections, listens for Payloads from projections and forwards them to web clients" "Node.js, Express, Socket.io [3000]" {
          tags "Group:Shop"
          tags "GroupPath:Shop"
        }

        group ".Projection" {
          shop_projection_db = container "Shop Projection Database" "Read DB for denormalized views" "Node.js, MongoDB [default]" {
            tags "Database"
            tags "Group:Shop"
            tags "Group:Projection"
            tags "GroupPath:Shop/Projection"
          }
          shop_projection_service = container "Shop Projection" "Handles fetches, subscribes to DomainEvents, denormalizes and upserts Payloads, pushes Payloads to bff" "Node.js, Express, Socket.io-client [3002]" {
            tags "Group:Shop"
            tags "Group:Projection"
            tags "GroupPath:Shop/Projection"
          }
        }

        group ".Website" {
          shop_webserver = container "Shop Frontend SPA" "Web interface, connects to bff via wss, sends Queries and Commands to bff, renders incoming Payloads" "Browser, Socket.io.min [URL]" {
            tags "Webclient"
            tags "Group:Shop"
            tags "Group:Website"
            tags "GroupPath:Shop/Website"
          }
          shop_webserver_server = container "Shop Frontend Server" "Serves static files" "Nginx [3001]" {
            tags "Group:Shop"
            tags "Group:Website"
            tags "GroupPath:Shop/Website"
          }
          shop_webserver_user = container "User" "End user interacting via browser" "Person" {
            tags "Person"
            tags "Group:Shop"
            tags "Group:Website"
            tags "GroupPath:Shop/Website"
          }
          shop_webserver_server -> shop_webserver "serves"
          shop_webserver_user -> shop_webserver "uses"
        }
    }


      calendar_eventstore_service -> calendar_eventstore_db "read, write"
      calendar_service -> broker_service "subscribe to certain Commands, publish DomainEvents"
      calendar_service -> calendar_eventstore_service "fetch streams, commit DomainEvents"
      order_eventstore_service -> order_eventstore_db "read, write"
      order_service -> broker_service "subscribe to certain Commands, publish DomainEvents"
      order_service -> order_eventstore_service "fetch streams, commit DomainEvents"
      otel_collector -> calendar_eventstore_service "sdk metrics/traces (otel:4318)"
      otel_collector -> calendar_service "sdk metrics/traces (otel:4318)"
      otel_collector -> order_eventstore_service "sdk metrics/traces (otel:4318)"
      otel_collector -> order_service "sdk metrics/traces (otel:4318)"
      otel_collector -> shop_bff_service "sdk metrics/traces (otel:4318)"
      otel_collector -> shop_projection_service "sdk metrics/traces (otel:4318)"
      otel_grafana -> otel_prometheus "explore metrics (prom:9090)"
      otel_grafana -> otel_tempo "explore traces (tempo:3200)"
      otel_prometheus -> broker_service "scrape metrics (broker:15692)"
      otel_prometheus -> calendar_eventstore_service "scrape metrics (/metrics:9100)"
      otel_prometheus -> calendar_service "scrape metrics (/metrics:9100)"
      otel_prometheus -> order_eventstore_service "scrape metrics (/metrics:9100)"
      otel_prometheus -> order_service "scrape metrics (/metrics:9100)"
      otel_prometheus -> otel_collector "scrapes metrics (otel:9464 otel:8888)"
      otel_prometheus -> shop_bff_service "scrape metrics (/metrics:9100)"
      otel_prometheus -> shop_projection_service "scrape metrics (/metrics:9100)"
      otel_tempo -> otel_collector "gets metrics/traces (otel:4318)"
      shop_bff_service -> broker_service "publish Commands"
      shop_projection_db -> order_eventstore_service "seed script via fetch streams"
      shop_projection_service -> broker_service "subscribe to certain DomainEvents"
      shop_projection_service -> shop_bff_service "listen for Queries and push Payloads"
      shop_projection_service -> shop_projection_db "fetch data, upsert data"
      shop_webserver -> shop_bff_service "send Commands and Queries, listen for Payloads"
  }
  views {
    container sys_Event_Platform "containers-event-platform" "Event Platform containers" {
      include *
    }
    container sys_Calendar_Domain "containers-calendar-domain" "Calendar Domain containers" {
      include *
    }
    container sys_Order_Domain "containers-order-domain" "Order Domain containers" {
      include *
    }
    container sys_Observability "containers-observability" "Observability containers" {
      include *
    }
    container sys_Shop "containers-shop" "Shop containers" {
      include *
    }
    systemlandscape "all-systems" "All systems" {
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
      element "Observability" {
        shape roundedbox
        background "darkorange"
      }
      element "Database" {
        shape cylinder
        background "orchid"
      }
      element "DatabaseObservability" {
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
      element "PersonObservability" {
        shape person
        background "seagreen"
      }
    }
    theme default
  }
}
