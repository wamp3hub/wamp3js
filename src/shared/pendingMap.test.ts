import {describe, it, expect} from 'vitest'
import {NewPendingMap} from '~/shared/pendingMap'
import NewID from '~/shared/newID'


describe('pending should be', () => {
    let pendingMap = NewPendingMap()

    it('completable', async () => {
        let ID = NewID()
        let expectedPayload = 'WAMP'
        setTimeout(() => pendingMap.complete(ID, expectedPayload), 333)
        let {promise} = pendingMap.create(ID)
        let actualPayload = await promise
        expect(actualPayload).toBe(expectedPayload)
    })

    it('cancellable', async () => {
        
    })

    it('not existing', async () => {
    })
})