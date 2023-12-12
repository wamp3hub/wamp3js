import {Join} from '@transports/websocket'
import NewJSONSerializer from '@serializers/json'


export async function main() {
    let serializer = NewJSONSerializer()
    // @ts-ignore
    window.wamp = await Join('localhost:5173', false, {username: 'test', password: 'secret'}, serializer)
    console.log('join success')
}

// await main()
