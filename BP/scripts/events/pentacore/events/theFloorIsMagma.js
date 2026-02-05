import { system } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'theFloorIsMagma',
    callback: (async event => {
        const block = event.block;
        const dimension = event.dimension;

        const radius = f.Random.int(15, 20);
        const locations = Array.from(f.Geo.mcCube(block.location, radius))
        .filter(l => f.Geo.distance(l, block) < radius)
        .toSorted((a, b) => f.Geo.distanceSquared(a, block) - f.Geo.distanceSquared(b, block));
        const awaitIndex = Math.ceil(locations.length/4/radius);

        await system.waitTicks(1);
        event.player.sendMessage('§4The floor is magma!')

        for (let i = 0; i < locations.length; i++) {
            const location = locations[i];

            try {
                const bl = dimension.getBlock(location);
                
                if (!bl.isAir && !bl.isLiquid) bl.setType('magma');
            } catch {}

            if (i%awaitIndex == 0) await system.waitTicks(1);
        }
    })
})