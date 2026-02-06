import { ItemStack, ItemTypes, system } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'foodPack',
    callback: (async event => {
        const amount = f.Random.int(5, 25);
        const center = event.block.center();
        
        const allFoodTypes = ItemTypes.getAll().filter(t => { 
            const item = new ItemStack(t);
            return item.getComponent('food') != undefined || item.hasTag('minecraft:is_food')
        });
        const types = f.Random.select(allFoodTypes, amount, true);

        for (const type of types) {
            const item = new ItemStack(type);
            item.amount = f.Random.int(1, item.maxAmount);

            const entity = event.dimension.spawnItem(item, center);
             entity.applyImpulse(f.Vector.multiply(f.Vector.sum({ y: 1 }, { x: f.Random.float(-0.3, 0.3), z: f.Random.float(-0.3, 0.3) }), f.Random.float(0.5, 0.8)));
        }

        await system.waitTicks(2);
        event.block.setType('cake');
    })
});