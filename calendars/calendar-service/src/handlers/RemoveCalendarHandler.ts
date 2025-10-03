import { BaseHandler } from './BaseHandler';
import { IRemoveCalendarCommand } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class RemoveCalendarHandler extends BaseHandler<IRemoveCalendarCommand> {
    async handle(cmd: IRemoveCalendarCommand) {
        await trace.getTracer('calendar').startActiveSpan('RemoveCalendar', async (span: any) => {
            try {
                // add attributes
                span.setAttribute('calendar.id', cmd.payload.calendarId);
                span.setAttribute('messaging.message.conversation_id', cmd.correlationId);
                // business logic
                const calendar = await this.load(cmd.payload.calendarId);
                calendar.removeCalendar(cmd.payload.calendarId, cmd.correlationId);
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
