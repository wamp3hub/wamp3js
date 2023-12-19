import {describe, it, expect} from 'vitest'
import * as domain from '~/domain'
import NewJSONSerializer from '~/serializers/json'
import NewID from "~/shared/newID"


describe('should encode and decode', () => {
    let serializer = NewJSONSerializer()

    function test(event: domain.Event) {
        let encoded = serializer.encode(event)
        let decoded = serializer.decode(encoded)
        expect(decoded).toEqual(event)
    }

    let publishEvent = domain.NewPublishEvent({URI: 'net.example'}, 'Hello, WAMP!')
    let acceptEvent = domain.NewAcceptEvent(publishEvent)
    let callEvent = domain.NewCallEvent({URI: 'net.example', timeout: 60}, 'Hello, WAMP!')
    let replyEvent = domain.NewReplyEvent(callEvent, 'Hello, WAMP!')
    let errorEvent = domain.NewErrorEvent(callEvent, 'SomethingWentWrong')
    let cancelEvent = domain.NewCancelEvent(callEvent)
    let nextFeatures = {generatorID: NewID(), yieldID: NewID(), timeout: 60}
    let nextEvent = domain.NewNextEvent(nextFeatures)
    let yieldEvent = domain.NewYieldEvent(nextEvent, 'Hello, WAMP!')
    let stopEvent = domain.NewStopEvent(nextEvent)
    it('accept event', () => {test(acceptEvent)})
    it('publish event', () => {test(publishEvent)})
    it('call event', () => {test(callEvent)})
    it('reply event', () => {test(replyEvent)})
    it('error event', () => {test(errorEvent)})
    it('cancel event', () => {test(cancelEvent)})
    it('next event', () => {test(nextEvent)})
    it('yield event', () => {test(yieldEvent)})
    it('stop event', () => {test(stopEvent)})
})