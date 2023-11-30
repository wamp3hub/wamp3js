export default function isGeneratorFunction(f: any) {
    return (
        f
        && f.constructor
        && (f.constructor.name === 'GeneratorFunction' || f.constructor.name === 'AsyncGeneratorFunction')
    )
}
