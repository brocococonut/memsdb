import { EventName, MemsDBEvent } from './types/events'

export class EventHandler {
  eventType: EventName

  func: (event: MemsDBEvent) => void = () => {}

  constructor(eventType: EventName, func: (event: MemsDBEvent) => void) {
    this.eventType = eventType

    this.func = func
  }
}
