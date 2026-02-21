import * as f from "./functions.js";
export {
    LuckyEventType
}

/**
 * @typedef LuckyEventTypeRegistrationOptions
 * @property {String} [id]
 * @property {(event: import('@minecraft/server').BlockComponentPlayerBreakEvent) => Void} callback
 */

class LuckyEventType {
    /** @type {Map<String, LuckyEventTypeRegistrationOptions>} */
    static #registered = new Map();

    /** @param {import('@minecraft/server').BlockComponentPlayerBreakEvent} vanillaEventData */
    static EventFunctionMain(vanillaEventData) {
        const eventType = f.Random.element(LuckyEventType.getAll());
        if (eventType) eventType.callback(vanillaEventData);
    }

    /** @param {String} id */
    static get(id) { return this.#registered.get(id); }
    static getAll() { return Array.from(this.#registered.values()); }


    /** @param {LuckyEventTypeRegistrationOptions} options */
    static register(options) {
        const id = options.id || 'event_no_' + (this.getAll().length + 1);
        options.id = id;

        this.#registered.set(id, options);
    }
}