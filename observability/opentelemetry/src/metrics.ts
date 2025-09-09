import { metrics } from '@opentelemetry/api';

type CqrsMetrics = {
  cmdTotal: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  evtTotal: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  cmdErrors: ReturnType<ReturnType<typeof metrics.getMeter>['createCounter']>;
  cmdLatency: ReturnType<ReturnType<typeof metrics.getMeter>['createHistogram']>;
};

// guard against duplicate registration in hot-reload
const KEY = '__cqrsMetrics__';

function create(): CqrsMetrics {
  const meter = metrics.getMeter('broker', '1.0.0');

  const cmdTotal  = meter.createCounter('cqrs_commands_total', { description: 'Total CQRS commands' });
  const evtTotal  = meter.createCounter('cqrs_events_total',   { description: 'Total CQRS events' });
  const cmdErrors = meter.createCounter('cqrs_command_errors_total', { description: 'Command handler errors' });
  const cmdLatency = meter.createHistogram('cqrs_command_duration_seconds', {
    description: 'Command processing latency',
    unit: 's'
  });

  return { cmdTotal, evtTotal, cmdErrors, cmdLatency };
}

export const cqrs = (globalThis as any)[KEY] || ((globalThis as any)[KEY] = create());

export function incCommand(commandName: string, queue: string) {
  cqrs.cmdTotal.add(1, { command: commandName, queue });
}
export function incEvent(eventType: string, exchange: string) {
  cqrs.evtTotal.add(1, { event: eventType, exchange });
}
export function incCommandError(commandName: string, queue: string) {
  cqrs.cmdErrors.add(1, { command: commandName, queue });
}
export function observeCommandLatency(seconds: number, commandName: string, queue: string, result: 'ok'|'error') {
  cqrs.cmdLatency.record(seconds, { command: commandName, queue, result });
}
