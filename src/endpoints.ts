import * as domain from '@domain'
import NewID from "@shared/newID"

export type PublishProcedure = (publishEvent: domain.PublishEvent) => Promise<void>

export type CallProcedure<T=any> = (callEvent: domain.CallEvent) => Promise<T>

export type GeneratorProcedure<T=any> = (callEvent: domain.CallEvent) => AsyncGenerator<T>


export function NewPublishEventEndpoint(
    procedure: PublishProcedure,
) {
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        await procedure(publishEvent)
    }
}

export function NewCallEventEndpoint(
    procedure: CallProcedure,
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
    next(request: domain.CallEvent | domain.NextEvent): Promise<domain.YieldEvent | domain.ErrorEvent>
}

export function NewPieceByPieceEndpoint(
    procedure: GeneratorProcedure,
) {
    function NewPieceByPiece(
        generator: AsyncGenerator,
    ): PieceByPiece {
        let done = false

        return {
            ID: NewID(),

            get active() {
                return !done
            },

            async next(
                request: domain.CallEvent | domain.NextEvent
            ) {
                let result = await generator.next()

                if (result.done) {
                    done = true
                    return domain.NewErrorEvent(request, 'GeneratorExit')
                } else {
                    return domain.NewYieldEvent(request, result.value)
                }
            },
        }
    }

    return function (callEvent: domain.CallEvent): PieceByPiece {
        let generator = procedure(callEvent)
        return NewPieceByPiece(generator)
    }
}
