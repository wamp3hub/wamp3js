import * as domain from '@domain'
import {
    NewPublishEventEndpoint,
    NewCallEventEndpoint,
    NewPieceByPieceEndpoint,
    ProcedureToPublish,
    ProcedureToCall,
    ProcedureToGenerate,
} from '@endpoints'
import {Peer} from '@peer'

export function NewPublishEventEntrypoint(
    router: Peer,
    procedure: ProcedureToPublish,
): (publishEvent: domain.PublishEvent) => Promise<void> {
    let endpoint = NewPublishEventEndpoint(procedure)
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        console.log(`new publish event router.ID=${router.ID}`)
        await endpoint(publishEvent)
    }
}

export function NewCallEventEntrypoint(
    router: Peer,
    procedure: ProcedureToCall,
): (callEvent: domain.CallEvent) => Promise<void> {
    let endpoint = NewCallEventEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        console.log(`new call event router.ID=${router.ID}`)
        let replyEvent = await endpoint(callEvent)
        await router.send(replyEvent)
    }
}

export function NewPieceByPieceEntrypoint(
    router: Peer,
    procedure: ProcedureToGenerate,
): (callEvent: domain.CallEvent) => Promise<void> {
    let endpoint = NewPieceByPieceEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        let pieceByPiece = endpoint(callEvent)

        let pendingStopEvent = router.pendingCancelEvents.create(pieceByPiece.ID)

        let yieldEvent = domain.NewYieldEvent(callEvent, {ID: pieceByPiece.ID})

        while (true) {
            let pendingNextEvent = router.pendingNextEvents.create(yieldEvent.ID)

            await router.send(yieldEvent)

            let mbNextEvent = await Promise.race(
                [pendingNextEvent.promise, pendingStopEvent.promise]
            )

            if (mbNextEvent.kind === domain.MessageKinds.Stop) {
                pendingStopEvent.cancel()
                break
            }

            let pendingYieldEvent = pieceByPiece.next(mbNextEvent)

            let mbYieldEvent = await Promise.race(
                [pendingYieldEvent, pendingStopEvent.promise]
            )

            if (mbYieldEvent.kind === domain.MessageKinds.Yield) {
                yieldEvent = mbYieldEvent
                continue
            }

            if (mbYieldEvent.kind !== domain.MessageKinds.Stop) {
                pendingStopEvent.cancel()
                await router.send(mbYieldEvent)
            }

            break
        }
    }
}
