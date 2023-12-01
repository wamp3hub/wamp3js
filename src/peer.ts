import * as domain from '@domain'
import {Observable, NewObservable} from '@shared/observable'
import {PendingMap, NewPendingMap} from '@shared/pendingMap'

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

    pendingAcceptEvents: PendingMap<domain.AcceptEvent>
    incomingPublishEvents: Observable<domain.PublishEvent>
    incomingCallEvents: Observable<domain.CallEvent>
    pendingCancelEvents: PendingMap<domain.CancelEvent | domain.StopEvent>
    pendingReplyEvents: PendingMap<domain.ReplyEvent | domain.YieldEvent | domain.ErrorEvent>
    pendingNextEvents: PendingMap<domain.NextEvent>

    send(event: domain.Event): Promise<void>
    close(): Promise<void>
}

export function SpawnPeer(ID: string, transport: Transport) {
    let pendingAcceptEvents = NewPendingMap<domain.AcceptEvent>()
    let incomingPublishEvents = NewObservable<domain.PublishEvent>()
    let incomingCallEvents = NewObservable<domain.CallEvent>()
    let pendingCancelEvents = NewPendingMap<domain.CancelEvent | domain.StopEvent>()
    let pendingReplyEvents = NewPendingMap<domain.ReplyEvent | domain.YieldEvent | domain.ErrorEvent>()
    let pendingNextEvents = NewPendingMap<domain.NextEvent>()

    async function safeSend(event: domain.Event) {
        transport.write(event)
    }

    async function acknowledge(sourceEvent: domain.Event) {
        let acceptEvent = domain.NewAcceptEvent(sourceEvent)
        await safeSend(acceptEvent)
    }

    async function listen() {
        while (true) {
            let event = await transport.read()
            console.debug('new event', event)

            if (event.kind == domain.MessageKinds.Accept) {
                let __event = event as domain.AcceptEvent
                pendingAcceptEvents.complete(event.features.sourceID, __event)
            } else if (
                event.kind == domain.MessageKinds.Reply
                || event.kind == domain.MessageKinds.Error
                || event.kind == domain.MessageKinds.Yield
            ) {
                let __event = event as domain.ReplyEvent
                await acknowledge(__event)
                pendingReplyEvents.complete(event.features.invocationID, __event)
            } else if (event.kind == domain.MessageKinds.Next) {
                let __event = event as domain.NextEvent
                await acknowledge(__event)
                pendingNextEvents.complete(event.features.yieldID, __event)
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
                pendingCancelEvents.complete(event.features.invocationID, __event)
            } else {}
        }
    }

    listen()

    async function send(event: domain.Event) {
        console.debug('sending event', event)
        let {promise} = pendingAcceptEvents.create(event.ID)
        await safeSend(event)
        await promise
    }

    async function close() {
        await transport.close()
    }

    return {
        ID,
        pendingAcceptEvents,
        incomingPublishEvents,
        incomingCallEvents,
        pendingCancelEvents,
        pendingReplyEvents,
        pendingNextEvents,
        send,
        close,
    }
}
