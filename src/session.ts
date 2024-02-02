import * as domain from '~/domain'
import type {
    ProcedureToPublish,
    ProcedureToCall,
    ProcedureToGenerate,
} from '~/endpoints'
import {
    NewPublishEventEntrypoint,
    NewCallEventEntrypoint,
    NewPieceByPieceEntrypoint,
} from '~/entrypoints'
import {Peer} from '~/peer'

const DEFAULT_TIMEOUT = 60

export function isCallableFunction(f: any): f is ProcedureToCall {
    return (
        f
        && f.constructor
        && (f.constructor.name === 'Function' || f.constructor.name === 'AsyncFunction')
    )
}

export function isGeneratorFunction(f: any): f is ProcedureToGenerate {
    return (
        f
        && f.constructor
        && (f.constructor.name === 'GeneratorFunction' || f.constructor.name === 'AsyncGeneratorFunction')
    )
}

export type RemoteGenerator<T=any> = AsyncGenerator<domain.YieldEvent<T>>

export function NewRemoteGenerator<T>(
    router: Peer,
    yieldEvent: domain.YieldEvent,
): RemoteGenerator<T> {
    let generatorID = yieldEvent.payload.ID
    let response: domain.YieldEvent | domain.ReplyEvent | domain.ErrorEvent = yieldEvent
    return {
        [Symbol.asyncIterator]: function () { return this },

        async next() {
            let nextFeatures = {
                generatorID,
                yieldID: response.ID,
                timeout: DEFAULT_TIMEOUT,
            }
            let nextEvent = domain.NewNextEvent(nextFeatures)

            let pendingReplyEvent = router.pendingReplyEvents.create(nextEvent.ID)
            await router.send(nextEvent)
            response = await pendingReplyEvent.promise
            if (response.kind == domain.MessageKinds.Yield) {
                return {value: response, done: false}
            } else if (response.kind == domain.MessageKinds.Error) {
                if (response.payload.message == 'GeneratorExit') {
                    return {value: undefined, done: true}
                }
                throw response.payload.message
            }

            throw 'SomethingWentWrong'
        },

        async return(value: T) {
            return {value, done: true}
        },

        async throw(error: any) {
            throw error
        }
    }
}

export function NewSession(router: Peer) {
    let entrypointMap = new Map()
    let restoreMap = new Map()

    function onEntrypoint(event: domain.CallEvent | domain.PublishEvent) {
        let entrypoint = entrypointMap.get(event.route?.endpointID)
        if (entrypoint) {
            entrypoint(event)
        } else {
            console.error('entrypoint not found')
        }
    }

    router.incomingCallEvents.observe(onEntrypoint)
    router.incomingPublishEvents.observe(onEntrypoint)

    async function rejoin() {
        for (let restore of restoreMap.values()) {
            console.debug('restoring...')
            restore()
        }
    }

    async function onLeave() {
        entrypointMap.clear()
        restoreMap.clear()
    }

    router.rejoinEvents.observe(rejoin, onLeave)

    async function publish<I=any>(
        URI: string,
        payload: I,
        features: domain.PublishFeatures = {},
    ): Promise<void> {
        features.URI = URI
        let publishEvent = domain.NewPublishEvent(features, payload)
        await router.send(publishEvent)
    }

    async function call<O, I=any>(
        URI: string,
        payload: I,
        features?: domain.CallFeatures
    ): Promise<domain.ReplyEvent<O>>
    async function call<O, I=any>(
        URI: string,
        payload: I,
        features?: domain.CallFeatures
    ): Promise<RemoteGenerator<O>>
    async function call<O, I=any>(
        URI: string,
        payload: I,
        features: domain.CallFeatures = {},
    ): Promise<domain.ReplyEvent<O> | ReturnType<typeof NewRemoteGenerator>> {
        features.URI = URI
        features.timeout = (features.timeout ?? DEFAULT_TIMEOUT)
        let callEvent = domain.NewCallEvent(features, payload)
        let pendingReplyEvent = router.pendingReplyEvents.create(callEvent.ID)
        await router.send(callEvent)
        let replyEvent = await pendingReplyEvent.promise
        if (replyEvent.kind == domain.MessageKinds.Reply) {
            return replyEvent
        }
        if (replyEvent.kind == domain.MessageKinds.Yield) {
            return NewRemoteGenerator<O>(router, replyEvent) 
        }
        if (replyEvent.kind == domain.MessageKinds.Error) {
            throw replyEvent.payload.message
        }
        throw 'SomethingWentWrong'
    }

    async function unsubscribe(
        subscriptionID: string,
    ): Promise<void> {
        try {
            await call('wamp.router.unsubscribe', subscriptionID)
        } finally {
            restoreMap.delete(subscriptionID)
            entrypointMap.delete(subscriptionID)
        }
    }

    async function unregister(
        registrationID: string,
    ): Promise<void> {
        try {
            await call('wamp.router.unregister', registrationID)
        } finally {
            restoreMap.delete(registrationID)
            entrypointMap.delete(registrationID)
        }
    }

    async function subscribe(
        URI: string,
        options: domain.SubscribeOptions,
        procedure: ProcedureToPublish,
    ): Promise<domain.Subscription> {
        let newResourcePayload = {URI, options}
        let {payload: subscription} = await call<domain.Subscription>('wamp.router.subscribe', newResourcePayload)
        let entrypoint = NewPublishEventEntrypoint(router, procedure)
        entrypointMap.set(subscription.ID, entrypoint)
        async function restore() {
            entrypointMap.delete(subscription.ID)
            subscribe(URI, options, procedure)
        }
        restoreMap.set(subscription.ID, restore)
        return subscription
    }

    async function register(
        URI: string,
        options: domain.RegisterOptions,
        procedure: ProcedureToCall | ProcedureToGenerate,
    ): Promise<domain.Registration> {
        let newResourcePayload = {URI, options}
        let {payload: registration} = await call<domain.Registration>('wamp.router.register', newResourcePayload)
        if (isCallableFunction(procedure)) {
            let entrypoint = NewCallEventEntrypoint(router, procedure)
            entrypointMap.set(registration.ID, entrypoint)
        } else if (isGeneratorFunction(procedure)) {
            let entrypoint = NewPieceByPieceEntrypoint(router, procedure)
            entrypointMap.set(registration.ID, entrypoint)
        }
        async function restore() {
            entrypointMap.delete(registration.ID)
            register(URI, options, procedure)
        }
        restoreMap.set(registration.ID, restore)
        return registration
    }

    async function leave(
        reason: string
    ): Promise<void> {
        console.debug('leaving session', reason)
        await router.close()
    }

    return {
        get ID(): string {
            return router.ID
        },
        publish,
        call,
        subscribe,
        register,
        unsubscribe,
        unregister,
        leave,
    }
}

export type Session = ReturnType<typeof NewSession>
