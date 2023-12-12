import {test, expect} from 'vitest'
import * as domain from '@domain'
import { Transport, SpawnPeer } from '@peer'
import NewID from "@shared/newID"
import NewQueue, {Queue} from '@shared/queue'

function NewMockTransport(
    rx: Queue<domain.Event>,
    tx: Queue<domain.Event>,
): Transport {
    return {
        read: () => rx.pop(),
        write: async (event: domain.Event) => tx.put(event),
        close: async () => {}
    }
}

export function NewDuplexMockTransport() {
    let left = NewQueue<domain.Event>()
    let right = NewQueue<domain.Event>()
    return {
        left: NewMockTransport(left, right),
        right: NewMockTransport(right, left),
    }
}

test('happy path', async () => {
    let peerID = NewID()
    let {left, right} = NewDuplexMockTransport()
    let lPeer = SpawnPeer(peerID, left)
    let rPeer = SpawnPeer(peerID, right)

    let expectedPublishEvent = domain.NewPublishEvent({URI: 'net.example'}, 'TEST')
    let expectedCallEvent = domain.NewCallEvent({URI: 'net.example', timeout: 60}, 'TEST')
    let expectedReplyEvent = domain.NewReplyEvent(expectedCallEvent, 'TEST')
    let expectedErrorEvent = domain.NewReplyEvent(expectedCallEvent, 'TEST')
    let expectedCancelEvent = domain.NewCancelEvent(expectedCallEvent)
    let nextFeatures = {generatorID: NewID(), yieldID: NewID(), timeout: 60}
    let expectedNextEvent = domain.NewNextEvent(nextFeatures)
    let expectedYieldEvent = domain.NewYieldEvent(expectedNextEvent, 'TEST')

    rPeer.incomingPublishEvents.observe({
        next: publishEvent => {
            expect(publishEvent).toEqual(expectedPublishEvent)
        },
        complete: () => {},
    })
    await lPeer.send(expectedPublishEvent)

    rPeer.incomingCallEvents.observe({
        next: callEvent => {
            expect(callEvent).toEqual(expectedCallEvent)
        },
        complete: () => {},
    })
    await lPeer.send(expectedCallEvent)

    let pendingReplyEvent = rPeer.pendingReplyEvents.create(expectedCallEvent.ID)
    await lPeer.send(expectedReplyEvent)
    expect(await pendingReplyEvent.promise).toEqual(expectedReplyEvent)

    let pendingErrorEvent = rPeer.pendingReplyEvents.create(expectedCallEvent.ID)
    await lPeer.send(expectedErrorEvent)
    expect(await pendingErrorEvent.promise).toEqual(expectedErrorEvent)

    let pendingCancelEvent = rPeer.pendingCancelEvents.create(expectedCallEvent.ID)
    await lPeer.send(expectedCancelEvent)
    expect(await pendingCancelEvent.promise).toEqual(expectedCancelEvent)

    let pendingNextEvent = rPeer.pendingNextEvents.create(nextFeatures.yieldID)
    await lPeer.send(expectedNextEvent)
    expect(await pendingNextEvent.promise).toEqual(expectedNextEvent)

    let pendingYieldEvent = rPeer.pendingReplyEvents.create(expectedNextEvent.ID)
    await lPeer.send(expectedYieldEvent)
    expect(await pendingYieldEvent.promise).toEqual(expectedYieldEvent)
})

