import { BaseHandler } from './BaseHandler';
import { IRemoveScheduledTimeslotCommand } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class RemoveScheduledTimeslotHandler extends BaseHandler<IRemoveScheduledTimeslotCommand> {
    async handle(cmd: IRemoveScheduledTimeslotCommand) {
        await trace.getTracer('calendar').startActiveSpan('RemoveScheduledTimeslot', async (span: any) => {
            try {
                // add attributes
                span.setAttribute('calendar.id', cmd.payload.calendarId);
                span.setAttribute('timeslot.id', cmd.payload.timeslotId);
                span.setAttribute('messaging.message.conversation_id', cmd.correlationId);
                // business logic
                const calendar = await this.load(cmd.payload.calendarId);
                calendar.removeSchedule(cmd.payload.calendarId, cmd.payload.timeslotId, cmd.correlationId);
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
