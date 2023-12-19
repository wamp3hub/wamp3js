import NewID from "~/shared/newID"

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

export type Event = {
    ID: string
    kind: MessageKinds
    features: any
}

export type AcceptFeatures = {
    sourceID: string
}

export type AcceptEvent = Event & {
    kind: MessageKinds.Accept
    features: AcceptFeatures
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

export type PublishEvent<T=any> = Event & {
    kind: MessageKinds.Publish
    features: PublishFeatures
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

export type CallEvent<T=any> = Event & {
    kind: MessageKinds.Call
    features: CallFeatures
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

export type CancelEvent = Event & {
    kind: MessageKinds.Cancel
    features: ReplyFeatures
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

export type ReplyEvent<T=any> = Event & {
    kind: MessageKinds.Reply
    features: ReplyFeatures
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
    message: string
}

export type ErrorEvent = Event & {
    kind: MessageKinds.Error
    features: ReplyFeatures
    payload: ErrorEventPayload
}

export function NewErrorEvent(
    sourceEvent: Event,
    message: string,
): ErrorEvent {
    return {
        ID: NewID(),
        kind: MessageKinds.Error,
        features: { invocationID: sourceEvent.ID, },
        payload: { message, },
    }
}

export type YieldEvent<T=any> = Event & {
    kind: MessageKinds.Yield
    features: ReplyFeatures
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

export type NextEvent = Event & {
    features: NextFeatures
}

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
    route: string[]
}

export type SubscribeOptions = ResourceOptions

export type RegisterOptions = ResourceOptions

export type Subscription = Resource<RegisterOptions>

export type Registration = Resource<RegisterOptions>
