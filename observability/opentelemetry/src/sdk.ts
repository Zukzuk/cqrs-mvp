import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  // Resource is picked up from env: OTEL_SERVICE_NAME + OTEL_RESOURCE_ATTRIBUTES
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT }),
    exportIntervalMillis: 5000,
    exportTimeoutMillis: 3000,
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown().finally(() => process.exit(0)));
