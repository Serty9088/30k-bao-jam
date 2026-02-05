import { CommandPermissionLevel, CustomCommandParamType, Player, system } from "@minecraft/server";
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
        const eventType = f.Random.element(LuckyEventType.getAll());

        if (eventType) eventType.callback(luckyEvent);
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

system.beforeEvents.startup.subscribe(data => {
    data.customCommandRegistry.registerEnum('pentacore:event-type', LuckyEventType.getAll().map(e => e.id));
    data.customCommandRegistry.registerCommand({
        name: 'pentacore:trigger-event',
        description: 'Triggers selected event (for debugging)',
        permissionLevel: CommandPermissionLevel.Admin,
        mandatoryParameters: [
            {
                name: 'pentacore:event-type',
                type: CustomCommandParamType.Enum
            }
        ],
        optionalParameters: [
            {
                name: 'block-location',
                type: CustomCommandParamType.Location
            }
        ]
    }, ((origin, ...args) => {
        const player = origin.initiator || origin.sourceEntity;
        if (!(player instanceof Player)) return;

        let block = origin.sourceBlock;
        if (args[1]) {
            try { block = player.dimension.getBlock(args[1]); } catch {};
        } else {
            try { block = player.getBlockFromViewDirection()?.block || block; } catch {};
        }

        if (block == undefined) return;

        system.run(() => {
            block.setType('bao_30k:lucky_block');
            
            /** @type {import('@minecraft/server').BlockComponentPlayerBreakEvent} */
            const data = { block, player, dimension: block.dimension, brokenBlockPermutation: block.permutation };
            block.setType('air');
            
            const event = LuckyEventType.get(args[0]);
            if (event) event.callback(new LuckyEvent(data));
        });
    })); 
});