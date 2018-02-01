const { VM } = require('vm2')

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
     * const safeScript = new SafeScript("function foo() { return 'bar' };foo();")
     * @param {string} script - The code to evaluate in string form.
     */
    constructor(script) {
        this.script = script
        this.VM = new VM({
            timeout: 1000,
            compiler: 'javascript',
            sandbox: {}
        })
    }

    /**Evaluate the code. Return the result.*/
    evaluate() {
        return this.VM.run(this.script)
    }
}