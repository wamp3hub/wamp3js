import * as domain from '@domain'
import NewID from "@shared/newID"

export function NewPublishEventEndpoint(
    procedure: domain.PublishProcedure,
) {
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        await procedure(publishEvent)
    }
}

export function NewCallEventEndpoint(
    procedure: domain.CallProcedure,
) {
    return async function (callEvent: domain.CallEvent): Promise<domain.ReplyEvent> {
        let payload = await procedure(callEvent)
        let replyEvent = domain.NewReplyEvent(callEvent, payload)
        return replyEvent
    }
}

export interface PieceByPiece {
    ID: string
    active: boolean
    next(request: domain.CallEvent | domain.NextEvent): Promise<domain.YieldEvent | domain.ReplyEvent>
}

export function NewPieceByPieceEndpoint(
    procedure: domain.CallProcedure,
) {
    function NewPieceByPiece(
        generator: AsyncGenerator,
    ) {
        return {
            ID: NewID(),

            get active(): boolean {
                return true
            },

            async next(
                request: domain.CallEvent | domain.NextEvent
            ): Promise<domain.ReplyEvent | domain.YieldEvent> {
                let {value, done} = await generator.next()
    
                if (done) {
                    return domain.NewReplyEvent(request, value)
                } else {
                    return domain.NewYieldEvent(request, value)
                }
            },
        }
    }

    return function (callEvent: domain.CallEvent): PieceByPiece {
        let generator = procedure(callEvent)
        return NewPieceByPiece(generator)
    }
}

