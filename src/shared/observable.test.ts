import {test, expect} from 'vitest'
import {NewObservable} from '@shared/observable'


test('observable happy path', () => {
    let {observe, next, complete} = NewObservable<string>()

    let expectedPayload = 'test'

    function newObserver<T=any>() {
        let __done = false
        return {
            get done(): boolean {
                return __done
            },

            next: (v: T) => {
                expect(v).toBe(expectedPayload)
            },

            complete: () => {
                __done = true
            },
        }
    }

    observe(newObserver())
    observe(newObserver())

    next(expectedPayload)
    complete()
})
