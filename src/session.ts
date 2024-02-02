import type {
    ProcedureToPublish,
    ProcedureToCall,
    ProcedureToGenerate,
} from '~/endpoints'
import * as domain from '~/domain'
import * as annotation from '~/annotation'
import {
    NewPublishEventEntrypoint,
    NewCallEventEntrypoint,
    NewPieceByPieceEntrypoint,
} from '~/entrypoints'
import * as peer from '~/peer'
import invalidURI from '~/shared/invalidURI'

const DEFAULT_TIMEOUT = 60

function resolveErrorEvent(v: domain.ErrorEvent): domain.SomethingWentWrong {
    switch (v.payload.name) {
        case domain.InvalidPayload.name:
            return new domain.InvalidPayload(v.payload.message)
        case domain.GeneratorExit.name:
            return new domain.GeneratorExit(v.payload.message)
        case domain.ProtocolError.name:
            return new domain.ProtocolError(v.payload.message)
        default:
            return new domain.ApplicationError(v.payload.message)
    }
}

export type RemoteGenerator<T=any> = AsyncGenerator<domain.YieldEvent<T>>

async function * NewRemoteGenerator<T>(
    router: peer.Peer,
    yieldEvent: domain.YieldEvent,
): RemoteGenerator<T> {
    let generatorID = yieldEvent.payload.ID
    let response: domain.YieldEvent | domain.ReplyEvent | domain.ErrorEvent = yieldEvent
    while (true) {
        let nextEvent = domain.NewNextEvent({
            generatorID,
            yieldID: response.ID,
            timeout: DEFAULT_TIMEOUT ,
        })

        let pendingReplyEvent = router.pendingReplyEvents.create(nextEvent.ID)

        await router.send(nextEvent)

        response = await pendingReplyEvent.promise

        if (response.kind == domain.MessageKinds.Yield) {
            // TODO try yield catch
            yield response
            continue
        }

        if (response.kind == domain.MessageKinds.Error) {
            let error = resolveErrorEvent(response)
            if (error instanceof domain.GeneratorExit) {
                break
            }
            throw error
        }

        throw new domain.ProtocolError('unexpected response')
    }
}

function isCallableFunction(f: any): f is ProcedureToCall {
    return (
        f
        && f.constructor
        && (f.constructor.name === 'Function' || f.constructor.name === 'AsyncFunction')
    )
}

function isGeneratorFunction(f: any): f is ProcedureToGenerate {
    return (
        f
        && f.constructor
        && (f.constructor.name === 'GeneratorFunction' || f.constructor.name === 'AsyncGeneratorFunction')
    )
}

export function NewSession(router: peer.Peer) {
    let entrypointMap = new Map()
    let restoreMap = new Map()

    function onEntrypoint(event: domain.CallEvent | domain.PublishEvent) {
        let entrypoint = entrypointMap.get(event.route!.endpointID)
        if (entrypoint) {
            entrypoint(event)
        } else {
            console.error(
                'entrypoint not found',
                { URI: event.features.URI, endpointID: event.route!.endpointID, }
            )
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

    let instance = {
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
        annotatePublication,
    }

    async function publish<I=any>(
        URI: string,
        payload: I,
        features: domain.PublishFeatures = {},
    ): Promise<void> {
        if (invalidURI(URI)) {
            throw new Error('InvalidURI')
        }
        features.URI = URI
        let publishEvent = domain.NewPublishEvent(features, payload)
        await router.send(publishEvent)
    }

    async function call<O, I=any>(
        URI: string,
        payload: I,
        features?: domain.CallFeatures,
    ): Promise<domain.ReplyEvent<O>>
    async function call<O, I=any>(
        URI: string,
        payload: I,
        features?: domain.CallFeatures,
    ): Promise<RemoteGenerator<O>>
    async function call<O, I=any>(
        URI: string,
        payload: I,
        features: domain.CallFeatures = {},
    ): Promise<domain.ReplyEvent<O> | RemoteGenerator<O>> {
        if (invalidURI(URI)) {
            throw new Error('InvalidURI')
        }
        features.URI = URI
        features.timeout = (features.timeout ?? DEFAULT_TIMEOUT)
        let callEvent = domain.NewCallEvent(features, payload)
        let pendingReplyEvent = router.pendingReplyEvents.create(callEvent.ID)
        await router.send(callEvent)
        let response = await pendingReplyEvent.promise
        if (response.kind == domain.MessageKinds.Reply) {
            return response
        }
        if (response.kind == domain.MessageKinds.Yield) {
            return NewRemoteGenerator<O>(router, response)
        }
        if (response.kind == domain.MessageKinds.Error) {
            throw resolveErrorEvent(response)
        }
        console.error('unexpected response', {callEvent, response})
        throw new domain.ProtocolError()
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
        if (invalidURI(URI)) {
            throw new Error('InvalidURI')
        }
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
        if (invalidURI(URI)) {
            throw new Error('InvalidURI')
        }
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
        reason: string,
    ): Promise<void> {
        console.debug('leaving session', reason)
        await router.close()
    }

    async function annotatePublication(
        URI: string,
        payloadSchema: annotation.Schema,
        description: string,
    ): Promise<void> {
        if (invalidURI(URI)) {
            throw new Error('InvalidURI')
        }
        await annotation.annotatePublication(instance, URI, payloadSchema, description)
    }

    return instance
}

export type Session = ReturnType<typeof NewSession>
