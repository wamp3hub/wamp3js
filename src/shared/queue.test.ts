import {describe, it, expect} from 'vitest'
import NewQueue from '~/shared/queue'


describe('queue', () => {
    let queue = NewQueue()

    let expectedItem = 'WAMP'

    it('await until push', async () => {
        setTimeout(() => queue.put(expectedItem), 333)
        let actualItem = await queue.pop()
        expect(actualItem).toBe(expectedItem)
    })

    it('pop from not empty queue', async () => {
        queue.put(expectedItem)
        let actualItem = await queue.pop()
        expect(actualItem).toBe(expectedItem)
    })
})
