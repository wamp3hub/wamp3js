import { v4 as uuid4 } from 'uuid'

export default function NewID(): string {
    return uuid4()
}

