import {test, expect} from 'vitest'
import {
    type NextFunction,
    type CompleteFunction,
    NewObservable
} from '~/shared/observable'


test('observable happy path', () => {
    let {observe, next, complete} = NewObservable<string>()

    let expectedPayload = 'test'

    function newObserver<T=any>(): [NextFunction<T>, CompleteFunction] {
        function next(v: T){
            expect(v).toBe(expectedPayload)
        }

        function complete(){
        }

        return [next, complete]
    }

    observe(...newObserver())
    observe(...newObserver())

    next(expectedPayload)
    complete()
})
