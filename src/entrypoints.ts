import * as domain from '@domain'
import {
    NewPublishEventEndpoint,
    NewCallEventEndpoint,
    NewPieceByPieceEndpoint
} from '@endpoints'
import {Peer} from '@peer'

export function NewPublishEventEntrypoint(
    router: Peer,
    procedure: domain.PublishProcedure,
) {
    let endpoint = NewPublishEventEndpoint(procedure)
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        await endpoint(publishEvent)
    }
}

export function NewCallEventEntrypoint(
    router: Peer,
    procedure: domain.CallProcedure,
) {
    let endpoint = NewCallEventEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        let replyEvent = await endpoint(callEvent)
        await router.send(replyEvent)
    }
}

export function NewPieceByPieceEntrypoint(
    router: Peer,
    procedure: domain.CallProcedure,
) {
    let endpoint = NewPieceByPieceEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        let pieceByPiece = endpoint(callEvent)
        let yieldEvent = domain.NewYieldEvent(callEvent, pieceByPiece.ID)
        let pendingStopEvent = router.pendingCancelEvents.create(pieceByPiece.ID)
        await router.send(yieldEvent)
        while (pieceByPiece.active) {
            let pendingNextEvent = router.pendingNextEvents.create(yieldEvent.ID)
            let nextEvent = await Promise.race(
                [pendingNextEvent.promise, pendingStopEvent.promise]
            )
            if (nextEvent.kind == domain.MessageKinds.Next) {
                let pendingYieldEvent = pieceByPiece.next(nextEvent)
                let yieldEvent = await Promise.race(
                    [pendingYieldEvent, pendingStopEvent.promise]
                )
                if (yieldEvent.kind == domain.MessageKinds.Yield) {
                    await router.send(yieldEvent)
                    continue
                }
            }

            break
        }
    }
}
