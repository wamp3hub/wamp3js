# WAMP3JS

```ts
async function * reverse (callEvent) {
    i = callEvent.payload
    while (i > -1) {
        yield i
        i--
    }
}
wamp.register('net.reverse', {}, reverse)

async function test() {
    let generator = await wamp.call('net.reverse', 10)
    for await (const i of generator) {
        console.log(i)
    }
}

test()
```

