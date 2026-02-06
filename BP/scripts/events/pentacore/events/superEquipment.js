import { ItemStack, ItemTypes, system } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'superEquipment',
    callback: (async event => {
        const amount = f.Random.int(1, 7);
        const enchantmentChance = f.Random.float(0.1, 0.9);
        const center = event.block.center();
        
        const allEquipmentTypes = ItemTypes.getAll().filter(t => new ItemStack(t).getComponent('enchantable') != undefined);
        const types = f.Random.select(allEquipmentTypes, amount, false);

        for (const type of types) {
            await system.waitTicks(5);

            const item = new ItemStack(type);
            f.addRandomEnchantments(item, { chance: enchantmentChance+f.Random.float(-0.1, 0.1) });

            event.dimension.spawnItem(item, center);
        }
    })
});