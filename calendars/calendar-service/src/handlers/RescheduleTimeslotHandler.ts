import { BaseHandler } from './BaseHandler';
import { IRescheduleTimeslotCommand } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class RescheduleTimeslotHandler extends BaseHandler<IRescheduleTimeslotCommand> {
    async handle(cmd: IRescheduleTimeslotCommand) {
        await trace.getTracer('calendar').startActiveSpan(
            'RescheduleTimeslot',
            async (span: any) => {
                try {
                    // add attributes
                    span.setAttribute('calendar.id', cmd.payload.calendarId);
                    span.setAttribute('timeslot.id', cmd.payload.timeslotId);
                    span.setAttribute('messaging.message.conversation_id', cmd.correlationId);
                    // business logic
                    const calendar = await this.load(cmd.payload.calendarId);
                    calendar.rescheduleTimeslot(cmd.payload, cmd.correlationId);
                    // persist and publish event
                    await this.saveAndPublish(calendar);
                } catch (err) {
                    span.recordException(err as Error);
                    throw err;
                } finally {
                    span.end();
                }
            }
        );
    }
}
