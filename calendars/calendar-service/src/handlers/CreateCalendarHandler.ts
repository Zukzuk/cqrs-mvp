import { BaseHandler } from './BaseHandler';
import { ICreateCalendarCommand } from '@daveloper/interfaces';
import { trace } from '@daveloper/opentelemetry';

export class CreateCalendarHandler extends BaseHandler<ICreateCalendarCommand> {
    async handle(cmd: ICreateCalendarCommand) {
        await trace.getTracer('calendar').startActiveSpan('CreateCalendar', async (span: any) => {
            try {
                // Add attributes to span
                span.setAttribute('calendar.id', cmd.payload.calendarId);
                span.setAttribute('messaging.message.conversation_id', cmd.correlationId);
                // Business logic
                const calendar = await this.load(cmd.payload.calendarId);
                calendar.createCalendar(cmd.payload.calendarId, cmd.correlationId);
                // Persist and publish event
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
