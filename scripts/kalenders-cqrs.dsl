workspace "Reflection Architecture (CQRS)" "CQRS model for Kalender" {

  model {
    // People
    user = person "User" "Web client user"

    // --- Messaging Broker ---
    BrokerSystem = softwareSystem "Kafka Broker" "Event streaming platform for Commands and Domain Events" {
      tags "Queue"
      commandsTopic = container "Commands Topic" "Kafka topic carrying command messages" "Kafka Topic" {
        tags "Queue"
      }
      domainEventsTopic = container "DomainEvents Topic" "Kafka topic carrying domain events" "Kafka Topic" {
        tags "Queue"
      }
    }
    
    // --- UI / Edge ---
    EdgeSystem = softwareSystem "Kalender App" "Browser application and its static hosting" {
      website = container "Webclient (Angular)" "Kalender UI in the browser" "Angular/TypeScript" {
        tags "Webclient"
      }
      webserver = container "Webserver (NGINX)" "Serves static assets and reverse proxies to BFF" "NGINX"
      bff = container "BFF (REST/SSE/WSS)" "Public API for the web client. Writes = commands, reads = projections." "Kotlin/Node.js"
    }

    // --- Reflection (Query/Projection) ---
    ReflectionSystem = softwareSystem "Reflection" "Builds and serves read models from domain events" {
      reflectionService = container "Reflection Service" "Consumes Domain Events and updates projections" "Kotlin/Node.js"
      reflectionDb = container "Reflection DB (Postgres/JSONB)" "Projections (JSONB), inbox/checkpoints & metadata" "Postgres" {
        tags "Database"
      }
    }
    
    // --- Kalender Domain ---
    DomainSystem = softwareSystem "Kalender Domain" "Command handling and event sourcing" {
      commandHandler = container "Command Handler" "Validates & invokes domain model; emits events" "JVM/Node"
      repository = container "Repository<Aggregate>" "Rehydrates non-anemic aggregates from the event store and persists new events" "JVM/Node"
      aggregate = container "Kalender Aggregate" "Domain model enforcing invariants (event-sourced)" "Domain Model"
      eventStore = container "Event Store DB" "Append-only event store for aggregates (streams by aggregate id)" "Postgres/EventStoreDB" {
        tags "Database"
      }
    }

    // --- Orchestration / Legacy Integration ---
    OrchestrationSystem = softwareSystem "Orchestrator" "Listens to domain events, orchestrates legacy side effects, emits commands" {
      orchestratorService = container "Orchestrator" "Process manager / saga: reacts to DomainEvents, calls Monolith, emits follow-up Commands" "Kotlin/Node.js"
    }
    
    // Legacy Application
    legacySystem = softwareSystem "Donna Classic" "Existing core system with transactional operations" {
      legacyApi = container "Monolith API" "Operations invoked by the Orchestrator" "Java"
    }

    // --- Web flow ---
    user -> website "Uses"
    webserver -> website "Serves"
    website -> bff "Calls read/write APIs (REST/SSE/WSS)"

    // --- BFF ---
    bff -> commandsTopic "Produces Commands"
    bff -> reflectionService "Queries projections for reads"

    // --- Domain flow ---
    commandHandler -> commandsTopic "Subscribes to Commands"
    commandHandler -> repository "Load & save aggregate"
    repository -> eventStore "loadStream / appendToStream"
    repository -> aggregate "Rehydrate / persist changes"
    commandHandler -> domainEventsTopic "Publishes Domain Events (post-persist)"

    // --- Projection flow ---
    reflectionService -> domainEventsTopic "Subscribes to Domain Events"
    reflectionService -> reflectionDb "Upsert projections & checkpoints"
    reflectionService -> reflectionDb "Queries on UID"
    reflectionService -> bff "Pushes updates"

    // --- Orchestration flow ---
    orchestratorService -> domainEventsTopic "Subscribes to Domain Events"
    orchestratorService -> legacyApi "Invokes transactional operation"
    legacyApi -> orchestratorService "Returns outcome (success / failure)"
    orchestratorService -> commandsTopic "On failure: emit Compensate command"
  }

  views {
    // --- System Landscape ---
    
    systemLandscape all-systems {
      include *
      title "System Landscape (CQRS - Kalender)"
    }

    // --- Container Views ---
    
    container BrokerSystem {
      include commandsTopic
      include domainEventsTopic
      include ReflectionSystem
      include EdgeSystem
      include DomainSystem
      title "03 Container View - Messaging"
    }
    
    container ReflectionSystem {
      include reflectionService
      include reflectionDb
      include EdgeSystem
      include commandsTopic
      include domainEventsTopic
      title "01 Container View - Reflection"
    }

    container EdgeSystem {
      include user
      include website
      include webserver
      include bff
      include ReflectionSystem
      include commandsTopic
      include domainEventsTopic
      title "02 Container View - Website"
    }

    container DomainSystem {
      include commandHandler
      include aggregate
      include eventStore
      include repository
      include commandsTopic
      include domainEventsTopic
      title "04 Container View - Domain"
    }

    container OrchestrationSystem {
      include orchestratorService
      include legacyApi
      include domainEventsTopic
      include commandsTopic
      title "05 Container View - Orchestration"
    }

    styles {
      element "Queue" {
        shape Hexagon
        background lightsalmon
        color #000000
      }
      element "Database" {
        shape Cylinder
        background salmon
        color #000000
      }
      element "Container" {
        background powderblue
        color #000000
      }
      element "Person" {
        shape Person
        background yellowgreen
        color #ffffff
      }
      element "Webclient" {
        shape Webbrowser
        background seagreen
        color #ffffff
      }
    }

    theme default
  }
}
