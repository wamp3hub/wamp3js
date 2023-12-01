import * as domain from '@domain'
import {
    NewPublishEventEndpoint,
    NewCallEventEndpoint,
    NewPieceByPieceEndpoint,
    PublishProcedure,
    CallProcedure,
    GeneratorProcedure,
} from '@endpoints'
import {Peer} from '@peer'

export function NewPublishEventEntrypoint(
    router: Peer,
    procedure: PublishProcedure,
): (publishEvent: domain.PublishEvent) => Promise<void> {
    let endpoint = NewPublishEventEndpoint(procedure)
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        await endpoint(publishEvent)
    }
}

export function NewCallEventEntrypoint(
    router: Peer,
    procedure: CallProcedure,
): (callEvent: domain.CallEvent) => Promise<void> {
    let endpoint = NewCallEventEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        let replyEvent = await endpoint(callEvent)
        await router.send(replyEvent)
    }
}

export function NewPieceByPieceEntrypoint(
    router: Peer,
    procedure: GeneratorProcedure,
): (callEvent: domain.CallEvent) => Promise<void> {
    let endpoint = NewPieceByPieceEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        let pieceByPiece = endpoint(callEvent)

        let pendingStopEvent = router.pendingCancelEvents.create(pieceByPiece.ID)

        let yieldEvent = domain.NewYieldEvent(callEvent, {ID: pieceByPiece.ID})

        while (pieceByPiece.active) {
            let pendingNextEvent = router.pendingNextEvents.create(yieldEvent.ID)

            await router.send(yieldEvent)

            let nextEvent = await Promise.race(
                [pendingNextEvent.promise, pendingStopEvent.promise]
            )

            if (nextEvent.kind == domain.MessageKinds.Next) {
                let pendingYieldEvent = pieceByPiece.next(nextEvent)

                let mbYieldEvent = await Promise.race(
                    [pendingYieldEvent, pendingStopEvent.promise]
                )

                if (mbYieldEvent.kind == domain.MessageKinds.Yield) {
                    yieldEvent = mbYieldEvent
                    continue
                }
            }

            break
        }
    }
}
