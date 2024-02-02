import * as domain from '~/domain'
import * as peer from '~/peer'
import {Session, NewSession} from '~/session'
import {DefaultSerializer} from '~/serializers'
import {NewQueue} from '~/shared/queue'
import {RetryStrategy, DefaultRetryStrategy} from '~/shared/retryStrategy'
import HTTP2Interview from '~/transports/interview'
import * as reconnectable from '~/transports/reconnectable'

async function connect(
    address: string,
    serializer: peer.Serializer = DefaultSerializer,
): Promise<peer.Transport> {
    return new Promise((resolve, reject) => {
        console.debug('ws connecting...')

        let initialized = false
        let q = NewQueue<string>()
        let connection = new WebSocket(address)

        let self = {
            get open(): boolean {
                return connection.readyState === WebSocket.OPEN
            },

            async read(): Promise<domain.Event> {
                let v = await q.pop()
                let event = serializer.decode(v)
                return event
            },

            async write(event: domain.Event) {
                let message = serializer.encode(event)
                connection.send(message)
            },

            async close() {
                connection.close()
            },
        }

        connection.onopen = openEvent => {
            console.debug('ws connection open', openEvent)
            initialized = true
            resolve(self)
        }

        connection.onclose = closeEvent => {
            console.warn('ws connection close', closeEvent)
            if (initialized) {
                let e = new (closeEvent.wasClean ? peer.ConnectionClosed : reconnectable.BadConnection)()
                q.put(e)
            } else {
                reject(closeEvent)
            }
        }

        connection.onmessage = async (message) => {
            q.put(message.data)
        }

        connection.onerror = errorEvent => {
            console.error('ws error', errorEvent)
        }
    })
}

export async function WebsocketConnect(
    address: string,
    serializer: peer.Serializer = DefaultSerializer,
    reconnectingStrategy: RetryStrategy = DefaultRetryStrategy,
): Promise<peer.Transport> {
    return await reconnectable.makeReconnectable(
        () => connect(address, serializer),
        reconnectingStrategy
    )
}

export type WebsocketJoinOptions = {
    credentials?: any
    secure?: boolean
    serializer?: peer.Serializer,
    reconnectingStrategy?: RetryStrategy,
}

export async function WebsocketJoin(
    address: string,
    options: WebsocketJoinOptions = {},
): Promise<Session> {
    if (options.secure === undefined) {
        options.secure = false
    }
    if (options.serializer === undefined) {
        options.serializer = DefaultSerializer
    }
    if (options.reconnectingStrategy === undefined) {
        options.reconnectingStrategy = DefaultRetryStrategy
    }

    let {yourID, ticket} = await HTTP2Interview(address, options.secure, options.credentials)

    let protocol = 'ws'
    if (options.secure) {
        protocol = 'wss'
    }
    let url = `${protocol}://${address}/wamp/v1/websocket?ticket=${ticket}`
    let transport = await WebsocketConnect(url, options.serializer)

    let __peer = peer.SpawnPeer(yourID, transport)
    let session = NewSession(__peer)
    return session
}
