import { NewQueue } from './queue'

export function NewLocker() {
    let __active = false
    let q = NewQueue<void>()

    async function lock(): Promise<void> {
        if (__active) {
            await q.pop()
        }
        __active = true
    }

    function unlock(): void {
        if (__active && q.length < 0) {
            q.put()
        } else {
            __active = false
        }
    }

    return {
        get active(): boolean {
            return __active
        },
        lock,
        unlock,
    }
}

export type Locker = ReturnType<typeof NewLocker>
