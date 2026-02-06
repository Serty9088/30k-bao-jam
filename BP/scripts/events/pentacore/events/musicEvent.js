import { ItemStack, ItemTypes } from "@minecraft/server";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'musicEvent',
    callback: (event => {
        event.block.setType('jukebox');
        
        const component = event.block.getComponent('record_player');
        const discTypes = ItemTypes.getAll().filter(t => t.id.startsWith('minecraft:music_disc')).toSorted(() => Math.random() - 0.5);

        for (const type of discTypes) {
            try {
                component.setRecord(type, true);
                break;
            } catch {};
        }
    })
});