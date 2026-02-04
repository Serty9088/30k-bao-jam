import * as f from "./functions.js";
export {
    LuckyEventType,
    LuckyEvent
}

/**
 * @typedef LuckyEventTypeRegistrationOptions
 * @property {String} [id]
 * @property {(event: LuckyEvent) => Void} callback
 */

class LuckyEventType {
    /** @type {Map<String, LuckyEventTypeRegistrationOptions>} */
    static #registered = new Map();

    /** @param {import('@minecraft/server').BlockComponentPlayerBreakEvent} vanillaEventData */
    static EventFunctionMain(vanillaEventData) {
        const luckyEvent = new LuckyEvent(vanillaEventData);
        const eventType = f.Random.element(this.getAll());

        if (eventType) eventType.callback(luckyEvent);
    }

    /** @param {String} */
    static get(id) { return this.#registered.get(id); }
    static getAll() { return Array.from(this.#registered.values()); }


    /** @param {LuckyEventTypeRegistrationOptions} options */
    static register(options) {
        const id = options.id || 'event:' + this.getAll().length;
        options.id = id;

        this.#registered.set(id, options);
    }
}

class LuckyEvent {
    /** @param {import('@minecraft/server').BlockComponentPlayerBreakEvent} event */
    constructor(event) {
        this.dimension = event.dimension;
        this.block = event.block;
        this.blockLocation = event.block.location;
        this.brokenBlockPermutation = event.brokenBlockPermutation;
        this.player = event.player;
    }
}

import "./events/_index.js";