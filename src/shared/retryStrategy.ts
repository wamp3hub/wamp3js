export class RetryAttemptsExceeded extends Error {}

export interface RetryStrategy {
    // Returns the number of attempts that have been made
    attemptNumber: number
    // Returns true if the maximum number of attempts has been reached
    done: boolean
    // Returns the next delay
    next(): number
    // Resets the attempt number to 0
    reset(): void
}

export function NewConstantRS(
    maximumAttempts: number,
    value: number = 1,
): RetryStrategy {
    let an = 0

    let self = {
        get done() {
            return an >= maximumAttempts
        },
        get attemptNumber() {
            return an
        },
        next() {
            if (self.done) {
                throw new RetryAttemptsExceeded()
            }

            an += 1
            return value
        },
        reset() {
            an = 0
        },
    }
    return self
}

export function NewBackoffRS(
    maximumAttempts: number,
    delay: number = 0,
    factor: number = 3,
    upperBound: number = 3600,
): RetryStrategy {
    let base = NewConstantRS(maximumAttempts, delay)

    return {
        get done() {
            return base.done
        },
        get attemptNumber() {
            return base.attemptNumber
        },
        next() {
            let d = base.next()
            let v = Math.pow(factor, base.attemptNumber - 1) - 1 + d
            if (v > upperBound) {
                v = upperBound
            }
            return Math.round(v)
        },
        reset() {
            base.reset()
        }
    }
}

export let DontRetryStrategy = NewConstantRS(0, 0)
export let DefaultRetryStrategy = NewBackoffRS(100)
