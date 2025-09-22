import { context, propagation, trace, Span, SpanStatusCode } from '@opentelemetry/api';

export type AmqpHeaders = Record<string, any>;

export { context, trace } from '@opentelemetry/api';

export function injectAmqpHeaders(headers: AmqpHeaders = {}): AmqpHeaders {
  // Write W3C `traceparent` + `baggage` into AMQP headers
  propagation.inject(context.active(), headers);
  return headers;
}

export function extractAmqpContext(headers: AmqpHeaders = {}) {
  // Build a context from incoming AMQP headers
  return propagation.extract(context.active(), headers);
}

const tracer = trace.getTracer('amqp');

export function startMsgSpan(
  name: string,
  kind: 'publish' | 'send' | 'consume',
  attrs: Record<string, unknown> = {}
): Span {
  return tracer.startSpan(name, {
    attributes: {
      'messaging.system': 'rabbitmq',
      'messaging.operation': kind,
      ...attrs,
    },
  });
}

export function endSpanOk(span: Span) {
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export function endSpanErr(span: Span, err: unknown) {
  span.recordException(err as any);
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
}
