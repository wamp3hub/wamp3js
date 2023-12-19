import {describe, it, expect} from 'vitest'
import * as domain from '~/domain'
import {
    NewPublishEventEndpoint,
    NewCallEventEndpoint,
    NewPieceByPieceEndpoint,
} from '~/endpoints'
import NewID from "~/shared/newID"


describe('publish event endpoints should be', () => {
    let expectedResult = 'Hello, WAMP!'

    async function foo({payload}: domain.PublishEvent) {
        expect(payload).toBe(expectedResult)
    }

    it('callable', async () => {
        let endpoint = NewPublishEventEndpoint(foo)
        let publishEvent = domain.NewPublishEvent({URI: 'net.example.foo'}, expectedResult)
        await endpoint(publishEvent)
    })

    async function broken(event: domain.PublishEvent) {
        console.log(event)
        throw 'Something went wrong'
    }

    it('safe', async () => {
        let endpoint = NewPublishEventEndpoint(broken)
        let event = domain.NewPublishEvent({URI: 'net.example.broken'}, expectedResult)
        await endpoint(event)
    })
})

describe('call event endpoints should be', () => {
    async function greeting({payload: name}: domain.CallEvent) {
        return `Hello, ${name}!`
    }

    it('callable', async () => {
        let endpoint = NewCallEventEndpoint(greeting)
        let callEvent = domain.NewCallEvent({URI: 'net.example.greeting'}, 'WAMP')
        let replyEvent = await endpoint(callEvent)
        expect(replyEvent.features.invocationID).toBe(callEvent.ID)
        expect(replyEvent.payload).toBe('Hello, WAMP!')
    })

    // async function long({payload: timeout}: domain.CallEvent) {
    //     if (timeout > 0 && timeout < 60000) {
    //         await new Promise(
    //             resolve => setTimeout(resolve, timeout)
    //         )
    //     }
    //     return timeout
    // }

    // it('cancellable', async () => {
    //     let endpoint = NewCallEventEndpoint(long)
    //     let callEvent = domain.NewCallEvent({URI: 'net.example.long'}, 1000)
    //     let pendingResponse = endpoint(callEvent)
    // })

    async function broken(event: domain.CallEvent) {
        console.log(event)
        throw 'Something went wrong'
    }

    it('safe', async () => {
        let endpoint = NewCallEventEndpoint(broken)
        let callEvent = domain.NewCallEvent({URI: 'net.example'}, undefined)
        let replyEvent = await endpoint(callEvent)
        expect(replyEvent.features.invocationID).toBe(callEvent.ID)
        expect(replyEvent.payload).toEqual({message: 'SomethingWentWrong'})
    })
})

describe('piece by piece endpoints should be', () => {
    async function * reverse({payload: n}: domain.CallEvent) {
        for (let i = n; i > -1; i--) {
            yield i
        }
    }

    it('iterable', async () => {
        let endpoint = NewPieceByPieceEndpoint(reverse)
        let n = 10
        let callEvent = domain.NewCallEvent({URI: 'net.example.reverse'}, n)
        let generator = endpoint(callEvent)
        let lastYieldID = NewID()
        while (n > -1) {
            let nextFeatures = {generatorID: generator.ID, yieldID: lastYieldID, timeout: 60}
            let nextEvent = domain.NewNextEvent(nextFeatures)
            let response = await generator.next(nextEvent)
            expect(response.kind).toBe(domain.MessageKinds.Yield)
            expect(response.features.invocationID).toBe(nextEvent.ID)
            expect(response.payload).toBe(n)
            lastYieldID = response.ID
            n -= 1
        }
        let nextFeatures = {generatorID: generator.ID, yieldID: lastYieldID, timeout: 60}
        let nextEvent = domain.NewNextEvent(nextFeatures)
        let response = await generator.next(nextEvent)
        expect(generator.active).toBe(false)
        expect(response.kind).toBe(domain.MessageKinds.Error)
        expect(response.payload.message).toBe('GeneratorExit')
    })

    // it('cancellable', async () => {
    // })

    async function * brokenReverse(event: domain.CallEvent) {
        console.log(event)
        throw 'SomethingWentWrong'
    }

    it('safe', async () => {
        let endpoint = NewPieceByPieceEndpoint(brokenReverse)
        let callEvent = domain.NewCallEvent({URI: 'net.example.broken_reverse'}, 10)
        let generator = endpoint(callEvent)
        let nextFeatures = {generatorID: generator.ID, yieldID: NewID(), timeout: 60}
        let nextEvent = domain.NewNextEvent(nextFeatures)
        let response = await generator.next(nextEvent)
        expect(response.kind).toBe(domain.MessageKinds.Error)
        expect(response.features.invocationID).toBe(nextEvent.ID)
        expect(response.payload).toEqual({message: 'SomethingWentWrong'})
        expect(generator.active).toBe(false)
    })
})

