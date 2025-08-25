import { trace, propagation, context, SpanKind, type Span, type Attributes } from '@opentelemetry/api';

export type PublishOptions = { 
    headers?: Record<string, unknown>; 
    persistent?: boolean 
};

// feature flag (optional)
const enabled = process.env.BROKER_TELEMETRY !== 'false';

export function injectHeaders(opts: PublishOptions = {}): PublishOptions {
    if (!enabled) return opts;
    const headers = { ...(opts.headers ?? {}) };
    propagation.inject(context.active(), headers as any);
    return { ...opts, headers };
}

export function startProducerSpan(
    kind: 'event' | 'command',
    destination: string,
    routingOrQueue: string,
    attrs: Attributes = {}
): Span | undefined {
    if (!enabled) return undefined;
    const tracer = trace.getTracer('broker');
    const base: Attributes = {
        'messaging.system': 'rabbitmq',
        'messaging.destination': destination,
        'messaging.destination_kind': kind === 'event' ? 'topic' : 'queue',
        ...(kind === 'event' ? { 'messaging.rabbitmq.routing_key': routingOrQueue } : {}),
        ...attrs,
    };
    return tracer.startSpan('mq.publish', { kind: SpanKind.PRODUCER, attributes: base });
}

export async function withExtractedContext<T>(
    headers: Record<string, unknown> | undefined,
    fn: () => Promise<T> | T
): Promise<T> {
    if (!enabled) return await fn();
    const ctx = propagation.extract(context.active(), (headers ?? {}) as any);
    return await context.with(ctx, fn);
}

export function startConsumerSpan(
    destination: string,
    routingKey?: string,
    attrs: Attributes = {}
): Span | undefined {
    if (!enabled) return undefined;
    const tracer = trace.getTracer('broker');
    const base: Attributes = {
        'messaging.system': 'rabbitmq',
        'messaging.destination': destination,
        'messaging.operation': 'process',
        ...(routingKey ? { 'messaging.rabbitmq.routing_key': routingKey } : {}),
        ...attrs,
    };
    return tracer.startSpan('mq.consume', { kind: SpanKind.CONSUMER, attributes: base });
}
