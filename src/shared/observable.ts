export type Observer<T> = {
    next: (value: T) => void
    complete: () => void
}

export type Observable<T> = {
    observe: (observer: Observer<T>) => void
    next: (value: T) => void
    complete: () => void
}

export function NewObservable<T>(): Observable<T> {
    let observerSet = new Set<Observer<T>>()

    function observe(observer: Observer<T>) {
        observerSet.add(observer)
    }

    function next(value: T) {
        for (let observer of observerSet) {
            observer.next(value)
        }
    }

    function complete() {
        for (let observer of observerSet) {
            observer.complete()
        }
    }

    return {
        observe,
        next,
        complete,
    }
}
