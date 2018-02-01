export class SafeScript {
    /**
     * @internal
     */
    static buildScript (script, funcCall) {
        return `${script}\npostMessage(${funcCall})`
    }

    /**Construct a container to run untrusted script.
     * @constructor
     * @example
     * const safeScript = new SafeScript("function foo() { return 'bar' }", "foo()")
     * @param {string} script - The code to evaluate in string form.
     * @param {string} funcCall - The function to call to get a return value.
     */
    constructor(script, funcCall) {
        this.script = this.buildScript(script, funcCall)
        this.blob = new Blob([this.script], { type: 'text/javascript' })
        this.url = URL.createObjectURL(this.blob)
        this.worker = undefined
    }

    /**Evaluate the code. Return a promise.
     * @example safeScript.evaluate()
     * .then((r) => console.log(r))
     * .catch((e) => console.log(e))
     * @return {Promise} - A promise for further then and catch.
     */
    evaluate() {
        return new Promise((resolve, reject) => {
            this.worker = new Worker(this.url)
            this.worker.onmessage = (event) => {
                this.worker.terminate()
                resolve(event.data)
            }
            this.worker.onerror = (event) => {
                this.worker.terminate()
                reject(event.message)
            }
        })
    }
}