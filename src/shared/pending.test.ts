import {describe, it, expect} from 'vitest'
import {NewPending} from '~/shared/pending'


describe('pending should be', () => {
    it('completable', async () => {
        let {promise, complete} = NewPending()
        let expectedPayload = 'WAMP'
        setTimeout(() => complete(expectedPayload), 333)
        let actualPayload = await promise
        expect(actualPayload).toBe(expectedPayload)
    })

    it('cancellable', async () => {
    })
})
