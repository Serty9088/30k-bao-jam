import { system } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: 'tamedWolfs',
    callback: (async event => {
        const amount = f.Random.int(4, 12);
        const radius = 3; const step = 360/amount;

        for (let i = 0; i < amount; i++) {
            const location = f.Vector.super(event.block.bottomCenter(), f.Vector.getFromAngles({ x: 0, y: step*i }), radius);

            const entity = event.dimension.spawnEntity('wolf', location);
            entity.getComponent('tameable').tame(event.player);
            entity.addEffect('slowness', (amount-i)*5 + 10, { amplifier: 255, showParticles: false });

            await system.waitTicks(5);
        }

        event.player.sendMessage('§vCongratulations on your new pets!');
    })
});