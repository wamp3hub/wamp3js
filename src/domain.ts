import NewID from "~/shared/newID"

export class SomethingWentWrong extends Error {
    constructor (message: any | undefined = undefined) {
        super(message)
        this.name = this.constructor.name
    }
}

export class ProtocolError extends SomethingWentWrong {}

export class InvalidPayload extends SomethingWentWrong {}

export class GeneratorExit extends SomethingWentWrong {}

export class GeneratorStop extends SomethingWentWrong {}

export class ApplicationError extends SomethingWentWrong {}

export enum MessageKinds {
    Call = 127,
    Cancel = 126,
    Stop = 126,
    Next = 125,
    Publish = 1,
    Accept = 0,
    Yield = -125,
    Error = -126,
    Reply = -127,
}

export type Event<T=any> = {
    ID: string
    kind: MessageKinds
    features: T
}

export type AcceptFeatures = {
    sourceID: string
}

export type AcceptEvent = Event<AcceptFeatures> & {
    kind: MessageKinds.Accept
}

export function NewAcceptEvent(sourceEvent: Event): AcceptEvent {
    return {
        ID: NewID(),
        kind: MessageKinds.Accept,
        features: { sourceID: sourceEvent.ID, },
    }
}

export type PublishFeatures = {
    URI?: string
}

export type PublishRoute = {
    endpointID: string
    publisherID: string
    subscriberID: string
    visitedRouters: string[]
}

export type PublishEvent<T=any> = Event<PublishFeatures> & {
    kind: MessageKinds.Publish
    payload: T
    route?: PublishRoute
}

export function NewPublishEvent<T=any>(
    features: PublishFeatures,
    payload: T,
): PublishEvent<T> {
    return {
        ID: NewID(),
        kind: MessageKinds.Publish,
        features,
        payload,
    }
}

export type CallFeatures = {
    URI?: string
    timeout?: number
}

export type CallRoute = {
    endpointID: string
    callerID: string
    executorID: string
    visitedRouters: string[]
}

export type CallEvent<T=any> = Event<CallFeatures> & {
    kind: MessageKinds.Call
    payload: T
    route?: CallRoute
}

export function NewCallEvent<T=any>(
    features: CallFeatures,
    payload: T,
): CallEvent<T> {
    return {
        ID: NewID(),
        kind: MessageKinds.Call,
        features,
        payload,
    }
}

export type ReplyFeatures = {
    invocationID: string
}

export type CancelEvent = Event<ReplyFeatures> & {
    kind: MessageKinds.Cancel
}

export function NewCancelEvent(
    sourceEvent: CallEvent,
): CancelEvent {
    return {
        ID: NewID(),
        kind: MessageKinds.Cancel,
        features: { invocationID: sourceEvent.ID, },
    }
}

export type ReplyEvent<T=any> = Event<ReplyFeatures> & {
    kind: MessageKinds.Reply
    payload: T
}

export function NewReplyEvent<T=any>(
    sourceEvent: Event,
    payload: T,
): ReplyEvent<T> {
    return {
        ID: NewID(),
        kind: MessageKinds.Reply,
        features: { invocationID: sourceEvent.ID, },
        payload,
    }
}

export type ErrorEventPayload = {
    name: string
    message: any
}

export type ErrorEvent = Event<ReplyFeatures> & {
    kind: MessageKinds.Error
    payload: ErrorEventPayload
}

export function NewErrorEvent(
    sourceEvent: Event,
    e: Error, 
): ErrorEvent {
    return {
        ID: NewID(),
        kind: MessageKinds.Error,
        features: { invocationID: sourceEvent.ID, },
        payload: { name: e.name, message: e.message, },
    }
}

export type YieldEvent<T=any> = Event<ReplyFeatures> & {
    kind: MessageKinds.Yield
    payload: T
}

export function NewYieldEvent<T=any>(
    sourceEvent: Event,
    payload: T,
): YieldEvent<T> {
    return {
        ID: NewID(),
        kind: MessageKinds.Yield,
        features: { invocationID: sourceEvent.ID, },
        payload,
    }
}

export type NextFeatures = {
    generatorID: string
    yieldID: string
    timeout: number
}

export type NextEvent = Event<NextFeatures>

export function NewNextEvent(
    features: NextFeatures,
): NextEvent {
    return {
        ID: NewID(),
        kind: MessageKinds.Next,
        features,
    }
}

export type StopEvent = CancelEvent

export function NewStopEvent(
    sourceEvent: NextEvent,
): StopEvent {
    return {
        ID: NewID(),
        kind: MessageKinds.Cancel,
        features: { invocationID: sourceEvent.ID, },
    }
}

type Resource<T> = {
    ID: string
    URI: string
    authorID: string
    options: T
}

type ResourceOptions = {
    route?: string[]
}

export type SubscribeOptions = ResourceOptions

export type RegisterOptions = ResourceOptions

export type Subscription = Resource<RegisterOptions>

export type Registration = Resource<RegisterOptions>
