import { ItemStack, ItemTypes, system } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'itemsFountain',
    callback: (async event => {
        const amount = f.Random.int(50, 200);
        const center = event.block.center();
        const types = ItemTypes.getAll();

        for (let i = 0; i < amount; i++) {
            await system.waitTicks(1);
            if (!event.dimension.isChunkLoaded(center)) return;

            const item = new ItemStack(f.Random.element(types));
            item.amount = f.Random.int(1, item.maxAmount);

            const entity = event.dimension.spawnItem(item, center);
            entity.applyImpulse(f.Vector.multiply(f.Vector.sum({ y: 1 }, { x: f.Random.float(-0.3, 0.3), z: f.Random.float(-0.3, 0.3) }), f.Random.float(0.5, 0.8)));
        }
    })
});