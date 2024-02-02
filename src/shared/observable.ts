export type NextFunction<T> = (value: T) => void
export type CompleteFunction = () => void

export type Observer<T> = {
    next: NextFunction<T>
    complete?: CompleteFunction
}

export type Observable<T> = {
    observe: (next: NextFunction<T>, complete?: CompleteFunction) => void
    next: (value: T) => void
    complete: () => void
}

export function NewObservable<T>(): Observable<T> {
    let observerSet = new Set<Observer<T>>()

    function observe(next: NextFunction<T>, complete: CompleteFunction | undefined = undefined) {
        observerSet.add({next, complete})
    }

    function next(value: T) {
        for (let observer of observerSet) {
            observer.next(value)
        }
    }

    function complete() {
        for (let observer of observerSet) {
            if (observer.complete === undefined) {
                continue
            }

            observer.complete()
        }
    }

    return {
        observe,
        next,
        complete,
    }
}
