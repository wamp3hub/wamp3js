import * as domain from '~/domain'
import {Observable, NewObservable} from '~/shared/observable'
import {PendingMap, NewPendingMap} from '~/shared/pendingMap'

export class ConnectionClosed extends Error {}

export class ConnectionRestored extends Error {}

export type Serializer = {
    encode(data: domain.Event): string
    decode(message: string): domain.Event
}

export type Transport = {
    write(data: domain.Event): Promise<void>
    read(): Promise<domain.Event>
    close(): Promise<void>
}

export type Peer = {
    ID: string

    incomingPublishEvents: Observable<domain.PublishEvent>
    incomingCallEvents: Observable<domain.CallEvent>
    pendingCancelEvents: PendingMap<domain.CancelEvent | domain.StopEvent>
    pendingReplyEvents: PendingMap<domain.ReplyEvent | domain.YieldEvent | domain.ErrorEvent>
    pendingNextEvents: PendingMap<domain.NextEvent>
    rejoinEvents: Observable<void>

    send(event: domain.Event): Promise<void>
    close(): Promise<void>
}

export function SpawnPeer(ID: string, transport: Transport): Peer {
    let pendingAcceptEvents = NewPendingMap<domain.AcceptEvent>()
    let incomingPublishEvents = NewObservable<domain.PublishEvent>()
    let incomingCallEvents = NewObservable<domain.CallEvent>()
    let pendingCancelEvents = NewPendingMap<domain.CancelEvent | domain.StopEvent>()
    let pendingReplyEvents = NewPendingMap<domain.ReplyEvent | domain.YieldEvent | domain.ErrorEvent>()
    let pendingNextEvents = NewPendingMap<domain.NextEvent>()
    let rejoinEvents = NewObservable<void>()

    async function acknowledge(sourceEvent: domain.Event) {
        let acceptEvent = domain.NewAcceptEvent(sourceEvent)
        await transport.write(acceptEvent)
        console.debug('acknowledgement successfully sent', sourceEvent)
    }

    async function send(event: domain.Event) {
        console.debug('sending event', event)
        let {promise} = pendingAcceptEvents.create(event.ID)
        await transport.write(event)
        await promise
        console.debug('event successfully sent', event)
    }

    async function close() {
        await transport.close()
    }

    async function listen() {
        console.debug('reading begin')
        while (true) {
            try {
                let event = await transport.read()

                console.debug('new incoming event', event)

                if (event.kind == domain.MessageKinds.Accept) {
                    let __event = event as domain.AcceptEvent
                    pendingAcceptEvents.complete(__event.features.sourceID, __event)
                } else if (
                    event.kind == domain.MessageKinds.Reply
                    || event.kind == domain.MessageKinds.Error
                    || event.kind == domain.MessageKinds.Yield
                ) {
                    let __event = event as domain.ReplyEvent
                    await acknowledge(__event)
                    pendingReplyEvents.complete(__event.features.invocationID, __event)
                } else if (event.kind == domain.MessageKinds.Next) {
                    let __event = event as domain.NextEvent
                    await acknowledge(__event)
                    pendingNextEvents.complete(__event.features.yieldID, __event)
                } else if (event.kind == domain.MessageKinds.Publish) {
                    let __event = event as domain.PublishEvent
                    await acknowledge(__event)
                    incomingPublishEvents.next(__event)
                } else if (event.kind == domain.MessageKinds.Call) {
                    let __event = event as domain.CallEvent
                    await acknowledge(__event)
                    incomingCallEvents.next(__event)
                } else if (event.kind == domain.MessageKinds.Cancel) {
                    let __event = event as domain.CancelEvent
                    await acknowledge(__event)
                    pendingCancelEvents.complete(__event.features.invocationID, __event)
                } else {
                    console.error(`unexpected event kind=${event.kind}`)
                }
            } catch (e) {
                if (e instanceof ConnectionClosed) {
                    console.error('connection closed')
                    break
                }

                if (e instanceof ConnectionRestored) {
                    console.warn('connection restored')
                    rejoinEvents.next()
                }

                console.error('during read incoming event', e)
                continue
            }
        }

        incomingPublishEvents.complete()
        incomingCallEvents.complete()
        rejoinEvents.complete()
        console.debug('reading end')
    }

    listen()

    return {
        ID,
        incomingPublishEvents,
        incomingCallEvents,
        pendingCancelEvents,
        pendingReplyEvents,
        pendingNextEvents,
        rejoinEvents,
        send,
        close,
    }
}
