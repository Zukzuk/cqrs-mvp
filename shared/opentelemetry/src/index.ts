import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const traceUrl  = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://otel-collector:4318/v1/traces';
const metricUrl = process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? 'http://otel-collector:4318/v1/metrics';

const sdk = new NodeSDK({
  // Resource is picked up from env: OTEL_SERVICE_NAME + OTEL_RESOURCE_ATTRIBUTES
  traceExporter: new OTLPTraceExporter({ url: traceUrl }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: metricUrl })
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown().finally(() => process.exit(0)));
