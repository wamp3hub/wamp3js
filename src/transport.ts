import { Observable } from 'core-js'

export interface Transport {
    messages: Observable
    send(data: any): void
    close(code: number | undefined, reason: string | undefined): void
}

export function connectWebSocket(
    address: string
): Promise<Transport> {
    return new Promise((resolve, reject) => {
        let connection = new WebSocket(address)

        let messages = new Observable(observer => {
            connection.onmessage = ({data}) => {
                let message = JSON.parse(data)
                observer.next(message)
            }

            connection.onerror = event => {
                console.debug('ws error', event)
                observer.error(event)
            }

            connection.onclose = event => {
                console.debug('ws connection close', event)
                observer.complete(event)
            }
        })

        function send(message: any) {
            let encoded = JSON.stringify(message)
            connection.send(encoded)
        }

        function close(code: number | undefined, reason: string | undefined) {
            connection.close(code, reason)
        }

        connection.onopen = event => {
            console.debug('ws connection open', event)
            resolve({messages, send, close,})
        }

        connection.onclose = event => {
            console.debug('ws connection close', event)
            reject(event)
        }
    })
}

