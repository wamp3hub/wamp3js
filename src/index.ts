import {Join} from '@transports/websocket'
import JSONSerializer from '@serializers/json'


async function main() {
    let serializer = JSONSerializer()
    window.wamp = await Join('localhost:5173', false, {username: 'test', password: 'secret'}, serializer)
    console.log('join success')
}

await main()
