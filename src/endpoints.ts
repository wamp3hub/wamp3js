import * as domain from '~/domain'
import NewID from '~/shared/newID'

export type ProcedureToPublish<I=any> = (publishEvent: domain.PublishEvent<I>) => Promise<void>

export type ProcedureToCall<I=any, O=any> = (callEvent: domain.CallEvent<I>) => Promise<O>

export type ProcedureToGenerate<I=any, O=any> = (callEvent: domain.CallEvent<I>) => AsyncGenerator<O>

export function NewPublishEventEndpoint(
    procedure: ProcedureToPublish,
) {
    return async function (publishEvent: domain.PublishEvent): Promise<void> {
        try {
            await procedure(publishEvent)
        } catch (error) {
            console.error('during execute publish event endpoint', { publishEvent, error })
        }
    }
}

export function NewCallEventEndpoint(
    procedure: ProcedureToCall,
) {
    return async function (callEvent: domain.CallEvent): Promise<domain.ReplyEvent | domain.ErrorEvent> {
        try {
            let replyPayload = await procedure(callEvent)
            return domain.NewReplyEvent(callEvent, replyPayload)
        } catch (error: any) {
            let isCustomError = error instanceof domain.ApplicationError
            if (!isCustomError) {
                console.error('during execute call event endpoint', { callEvent, error })
                error = new domain.ApplicationError()
            }
            return domain.NewErrorEvent(callEvent, error)
        }
    }
}

export function NewPieceByPieceEndpoint(
    procedure: ProcedureToGenerate,
) {
    function NewPieceByPiece(
        generator: AsyncGenerator,
    ) {
        let done = false

        let instance = {
            ID: NewID(),

            get active(): boolean {
                return !done
            },

            async next(
                request: domain.CallEvent | domain.NextEvent,
            ): Promise<domain.YieldEvent | domain.ErrorEvent> {
                try {
                    let result = await generator.next()

                    if (result.done) {
                        done = true
                        let error = new domain.GeneratorExit()
                        return domain.NewErrorEvent(request, error)
                    }

                    return domain.NewYieldEvent(request, result.value)
                } catch (error: any) {
                    done = true

                    let isCustomError = error instanceof domain.ApplicationError
                    if (!isCustomError) {
                        console.error('during execute piece by piece endpoint', { request, error })
                        error = new domain.ApplicationError()
                    }

                    return domain.NewErrorEvent(request, error)
                }
            },

            stop(): void {
                done = true
                generator.throw(new domain.GeneratorStop())
            },
        }

        return instance
    }

    type PieceByPiece = ReturnType<typeof NewPieceByPiece>

    return function (callEvent: domain.CallEvent): PieceByPiece {
        let generator = procedure(callEvent)
        return NewPieceByPiece(generator)
    }
}
