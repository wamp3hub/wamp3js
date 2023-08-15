import { v4 as uuid4 } from 'uuid'
import * as t from './transport'

type UUID = string

type Endpoint = (any) => any

enum EVENT_KINDS {
    HELLO = 0,
    PUBLISH = 1,
    ACCEPT = -1,
    CALL = 127,
    REPLY = -127,
}

interface HelloFeatures {
    yourID: UUID
}

interface OnHello {
    ID: string
    kind: EVENT_KINDS.HELLO
    features: HelloFeatures
}

interface PublishFeatures {
    URI: string
    include: string[]
    exclude: string[]
}

interface Publish {
    ID: string
    kind: EVENT_KINDS.PUBLISH
    features: PublishFeatures
    payload: any
}

interface PublishRoute {
    publisherID: string
    subscriberID: string
    endpointID: string
}

interface OnPublish extends Publish {
    route: PublishRoute
}

interface AcceptFeatures {
    sourceID: string
}

interface OnAccept {
    ID: string
    kind: EVENT_KINDS.ACCEPT
    features: AcceptFeatures
}

export interface CallFeatures {
    URI: string
}

interface Call {
    ID: string
    kind: EVENT_KINDS.CALL
    features: CallFeatures
    payload: any
}

interface CallRoute {
    callerID: string
    executorID: string
    endpointID: string
}

export interface OnCall extends Call {
    route: CallRoute
}

interface ReplyFeatures {
    invocationID: string
    OK: boolean
}

interface OnReply<T=any> {
    ID: string
    kind: EVENT_KINDS.REPLY
    features: ReplyFeatures
    payload: T
}

export interface SubscribeOptions {}

export interface RegisterOptions {}

interface Resource<T> {
    ID: string
    URI: string
    authorID: string
    options: T
}

interface Subscription extends Resource<SubscribeOptions> {}

interface Registration extends Resource<RegisterOptions> {}

interface Pending<T=any> {
    promise: Promise<T>
    resolve: (value: T) => void
    reject: (reason: any) => void
}

function newPending<T=any>(): Pending<T> {
    let resolve,
        reject,
        promise = new Promise<T>(
        (promiseResolve, promiseReject) => {
            resolve = promiseResolve
            reject = promiseReject
        }
    )
    return {promise, resolve, reject}
}

export function WAMPSession(
    address: string,
) {
    let transport: t.Transport
    let registrations = new Map()
    let subscriptions = new Map()
    let pendingMap = new Map()

    function awaitEvent(eventID: UUID) {
        let pending = newPending()
        pendingMap.set(eventID, pending)
        return pending.promise
    }

    function onPublish(publishEvent: OnPublish) {
        console.debug(`publish ${publishEvent.features.URI}`)

        let acceptEvent: OnAccept = {
            ID: uuid4(),
            kind: EVENT_KINDS.ACCEPT,
            features: {sourceID: publishEvent.ID}
        }
        transport.send(acceptEvent)

        let endpoint = subscriptions.get(publishEvent.route.endpointID)
        if (!endpoint) {
            let errorMessage = `subscription ${publishEvent.features.URI} not found`
            console.error(errorMessage)
            throw new Error(errorMessage)
        }

        try {
            endpoint(publishEvent)
        } catch (e) {
            console.error('subscribe endpoint error', e)
        }
    }

    function onAccept(acceptEvent: OnAccept) {
        let pending = pendingMap.get(acceptEvent.features.sourceID)
        if (pending) {
            pending.resolve(acceptEvent)
            console.debug('onAccept', acceptEvent.ID)
        } else {
            console.error('pending publication not found', acceptEvent.features.sourceID)
        }
    }

    function onCall(callEvent: OnCall) {
        console.debug(`call ${callEvent.features.URI}`)

        let acceptEvent: OnAccept = {
            ID: uuid4(),
            kind: EVENT_KINDS.ACCEPT,
            features: {sourceID: callEvent.ID}
        }
        transport.send(acceptEvent)

        let endpoint = registrations.get(callEvent.route.endpointID)
        if (!endpoint) {
            let errorMessage = `registration ${callEvent.features.URI} not found`
            console.error(errorMessage)
            throw new Error(errorMessage)
        }

        let replyEvent: OnReply = {
            ID: uuid4(),
            kind: EVENT_KINDS.REPLY,
            features: {
                OK: false,
                invocationID: callEvent.ID,
            },
            payload: undefined,
        }
        try {
            replyEvent.payload = endpoint(callEvent)
            replyEvent.features.OK = true
        } catch (e) {
            console.error('register endpoint error', e)
            replyEvent.payload = String(e)
        }
        transport.send(replyEvent)
    }

    function onReply(replyEvent: OnReply) {
        let pending = pendingMap.get(replyEvent.features.invocationID)
        if (pending) {
            pending.resolve(replyEvent)
            console.debug('onReply', replyEvent.ID)
        } else {
            console.error(`pending invocation not found ${replyEvent.features.invocationID}`)
        }
    }

    function onHello(request: OnHello) {
        session.ID = request.features.yourID
    }

    let session = {
        ID: '',

        async call<T=any>(
            features: CallFeatures,
            payload: any,
        ): Promise<OnReply<T>> {
            let callEvent: Call = {
                ID: uuid4(),
                kind: EVENT_KINDS.CALL,
                features,
                payload,
            }
            transport.send(callEvent)
            let replyEvent = await awaitEvent(callEvent.ID)
            if (replyEvent.features.OK) {
                return replyEvent
            }
            throw new Error(replyEvent.payload.code)
        },

        async register(
            URI: string,
            endpoint: Endpoint,
            options: RegisterOptions | undefined = undefined,
        ): Promise<Registration> {
            let response = await this.call(
                { URI: 'wamp.register' },
                { URI, options }
            )
            registrations.set(response.payload.ID, endpoint)
            console.debug(`register URI=${URI} ID=${response.payload.ID}`)
            return response.payload
        },

        async subscribe(
            URI: string,
            endpoint: Endpoint,
            options: SubscribeOptions | undefined = undefined,
        ): Promise<Subscription> {
            let response = await this.call(
                { URI: 'wamp.subscribe' },
                { URI, options }
            )
            subscriptions.set(response.payload.ID, endpoint)
            console.debug(`subscribe URI=${URI} ID=${response.payload.ID}`)
            return response.payload
        },

        async publish(
            features: PublishFeatures,
            payload: any,
        ) {
            let publishEvent: Publish = {
                ID: uuid4(),
                kind: EVENT_KINDS.PUBLISH,
                features,
                payload,
            }
            transport.send(publishEvent)
            await awaitEvent(publishEvent.ID)
        },

        async unsubscribe(
            subscriptionID: string,
        ) {
            await this.call({ ID: uuid4(), URI: 'wamp.unsubscribe' }, { subscriptionID })
            subscriptions.delete(subscriptionID)
        },

        async unregister(
            registrationID: string,
        ) {
            await this.call({ ID: uuid4(), URI: 'wamp.unregister' }, { registrationID })
            registrations.delete(registrationID)
        },

        async join() {
            transport = await t.connectWebSocket(address)
            transport.messages.subscribe({
                next(message) {
                    if (message.kind == EVENT_KINDS.ACCEPT) {
                        onAccept(message)
                    } else if (message.kind == EVENT_KINDS.REPLY) {
                        onReply(message)
                    } else if (message.kind == EVENT_KINDS.PUBLISH) {
                        onPublish(message)
                    } else if (message.kind == EVENT_KINDS.CALL) {
                        onCall(message)
                    } else if (message.kind == EVENT_KINDS.HELLO) {
                        onHello(message)
                    } else {
                        console.error('invalid message kind', message)
                    }
                }
            })
        },

        async leave(
            reason: string,
        ) {
            transport.close(1000, reason)
        },
    }

    return session
}

