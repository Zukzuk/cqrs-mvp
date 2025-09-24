import { BaseHandler } from './BaseHandler';
import { IScheduleTimeslotCommand } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class ScheduleTimeslotHandler extends BaseHandler<IScheduleTimeslotCommand> {
    async handle(cmd: IScheduleTimeslotCommand) {
        await trace.getTracer('calendar').startActiveSpan('ScheduleTimeslot', async (span) => {
            try {
                // add attributes
                span.setAttribute('calendar.id', cmd.payload.calendarId);
                span.setAttribute('timeslot.id', cmd.payload.timeslotId);
                span.setAttribute('messaging.message.conversation_id', cmd.correlationId);
                // business logic
                const calendar = await this.load(cmd.payload.calendarId);
                calendar.scheduleTimeslot(cmd.payload, cmd.correlationId);
                // persist and publish event
                await this.saveAndPublish(calendar);
            } catch (err) {
                span.recordException(err as Error);
                throw err;
            } finally {
                span.end();
            }
        });
    }
}
