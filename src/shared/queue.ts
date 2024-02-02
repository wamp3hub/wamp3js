import {Pending, NewPending} from '~/shared/pending'

export function NewQueue<T>() {
    let pendings: Pending<T>[] = []
    let items: (T | Error)[] = []

    return {
        get length(): number {
            return items.length - pendings.length
        },

        pop(): Promise<T> {
            if (items.length > 0) {
                let i = items.shift() as T | Error
                if (i instanceof Error) {
                    return Promise.reject(i)
                }
                return Promise.resolve(i)
            }

            let p = NewPending<T>()
            pendings.push(p)
            return p.promise
        },

        put(i: T | Error): void {
            if (pendings.length > 0) {
                let p = pendings.shift() as Pending<T>
                if (i instanceof Error) {
                    p.cancel(i)
                } else {
                    p.complete(i)
                }
            } else {
                items.push(i)
            }
        },
    }
}

export type Queue<T> = ReturnType<typeof NewQueue<T>>
