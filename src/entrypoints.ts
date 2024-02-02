import * as peer from '~/peer'
import * as pending from '~/shared/pending'
import * as domain from '~/domain'
import * as endpoints from '~/endpoints'

export function NewPublishEventEntrypoint(
    router: peer.Peer,
    procedure: endpoints.ProcedureToPublish,
): (publishEvent: domain.PublishEvent) => Promise<void> {
    let endpoint = endpoints.NewPublishEventEndpoint(procedure)
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        await endpoint(publishEvent)
    }
}

export function NewCallEventEntrypoint(
    router: peer.Peer,
    procedure: endpoints.ProcedureToCall,
): (callEvent: domain.CallEvent) => Promise<void> {
    let endpoint = endpoints.NewCallEventEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        let replyEvent = await endpoint(callEvent)
        await router.send(replyEvent)
    }
}

export function NewPieceByPieceEntrypoint(
    router: peer.Peer,
    procedure: endpoints.ProcedureToGenerate,
): (callEvent: domain.CallEvent) => Promise<void> {
    let endpoint = endpoints.NewPieceByPieceEndpoint(procedure)
    return async function (callEvent: domain.CallEvent): Promise<void> {
        let pieceByPiece = endpoint(callEvent)

        let yieldEvent = domain.NewYieldEvent(callEvent, {ID: pieceByPiece.ID})

        let pendingNextEvent: pending.Pending<domain.NextEvent>,
            pendingStopEvent = router.pendingCancelEvents.create(pieceByPiece.ID)

        pendingStopEvent.promise.then(() => {
            if (pendingNextEvent) {
                pendingNextEvent.cancel()
            }

            pieceByPiece.stop()
        })

        while (pieceByPiece.active) {
            pendingNextEvent = router.pendingNextEvents.create(yieldEvent.ID)

            await router.send(yieldEvent)

            let nextEvent = await pendingNextEvent.promise

            let response = await pieceByPiece.next(nextEvent)

            if (response.kind === domain.MessageKinds.Yield) {
                yieldEvent = response
            } else {
                await router.send(response)
            }
        }

        pendingStopEvent.cancel()
    }
}
