import { ApiPromise } from '@polkadot/api'
import { AugmentedEvent, AugmentedEvents } from '@polkadot/api/types'
import { Codec, IEvent, ISubmittableResult } from '@polkadot/types/types'
import { EventNotFoundError } from '../errors'
import { Event } from '@polkadot/types/interfaces'

export type EventSection = keyof AugmentedEvents<'promise'> & string
export type EventMethod<S extends EventSection> =
  keyof AugmentedEvents<'promise'>[S] & string

export type EventType<S extends EventSection, M extends EventMethod<S>> =
  ApiPromise['events'][S][M] extends AugmentedEvent<'promise', infer T>
    ? IEvent<T>
    : IEvent<Codec[]>

export type EventsSource = ISubmittableResult | Event[]

/**
 * Finds the first {section}.{method} event in tx result and returns it
 * or throws an error if the event cannot be found.
 *
 * @param result - tx result
 * @param section - event section (pallet name)
 * @param method - event method (event name)
 * @returns Type-safe representation of the event.
 */
export function getEvent<S extends EventSection, M extends EventMethod<S>>(
  source: EventsSource,
  section: S,
  eventName: M
): EventType<S, M> {
  const events = Array.isArray(source)
    ? source
    : source.events.map((r) => r.event)
  for (const e of events) {
    if (isEvent(e, section, eventName)) {
      return e
    }
  }

  throw new EventNotFoundError(section, eventName)
}

/**
 * Checks if an event is of given type.
 *
 * @param event - generic event
 * @param section - event section (pallet name) to check
 * @param method - event method (event name) to check
 * @returns True if event section and method matches, false otherwise.
 */
export function isEvent<
  S extends EventSection,
  M extends EventMethod<S>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>(event: IEvent<any>, section: S, method: M): event is EventType<S, M> {
  return event.section === section && event.method === method
}
