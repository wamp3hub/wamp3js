import {NewPending, Completable} from '@shared/pending'

export type Queue<T> = {
    pop(): Promise<T>
    put(item: T): void
}

export default function NewQueue<T>(): Queue<T> {
    let pendings: Completable<T>[] = []
    let items: T[] = []

    return {
        async pop(): Promise<T> {
            if (items.length === 0) {
                let {promise, complete} = NewPending<T>()
                pendings.push(complete)
                return await promise
            } else {
                let item = items.shift()!
                return item
            }
        },

        put(item: T): void {
            if (pendings.length > 0) {
                let completePending = pendings.shift()!
                completePending(item)
            } else {
                items.push(item)
            }
        },
    }
}
