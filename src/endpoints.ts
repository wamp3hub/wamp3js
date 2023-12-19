import * as domain from '~/domain'
import NewID from "~/shared/newID"

export type ProcedureToPublish<I=any> = (publishEvent: domain.PublishEvent<I>) => Promise<void>

export type ProcedureToCall<I=any, O=any> = (callEvent: domain.CallEvent<I>) => Promise<O>

export type ProcedureToGenerate<I=any, O=any> = (callEvent: domain.CallEvent<I>) => AsyncGenerator<O>

export function NewPublishEventEndpoint(
    procedure: ProcedureToPublish,
) {
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        try {
            await procedure(publishEvent)
        } catch {
            console.error('during execute publish event endpoint')
        }
    }
}

export function NewCallEventEndpoint(
    procedure: ProcedureToCall,
) {
    return async function (callEvent: domain.CallEvent): Promise<domain.ReplyEvent | domain.ErrorEvent> {
        try {
            let payload = await procedure(callEvent)
            return domain.NewReplyEvent(callEvent, payload)
        } catch {
            console.error('during execute call event endpoint')
            return domain.NewErrorEvent(callEvent, 'SomethingWentWrong')
        }
    }
}

export interface PieceByPiece {
    ID: string
    active: boolean
    next(request: domain.CallEvent | domain.NextEvent): Promise<domain.YieldEvent | domain.ErrorEvent>
}

export function NewPieceByPieceEndpoint(
    procedure: ProcedureToGenerate,
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
                try {
                    let result = await generator.next()

                    if (result.done) {
                        done = true
                        return domain.NewErrorEvent(request, 'GeneratorExit')
                    } else {
                        return domain.NewYieldEvent(request, result.value)
                    }
                } catch {
                    done = true
                    console.error('during execute piece by piece endpoint')
                    return domain.NewErrorEvent(request, 'SomethingWentWrong')
                }
            },
        }
    }

    return function (callEvent: domain.CallEvent): PieceByPiece {
        let generator = procedure(callEvent)
        return NewPieceByPiece(generator)
    }
}
