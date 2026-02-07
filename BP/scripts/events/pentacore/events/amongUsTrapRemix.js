//@ts-check
import * as f from "../functions.js";
import { world } from "@minecraft/server";
import { LuckyEventType } from "../main.js";

LuckyEventType.register({
    id: "AmongUsTrapRemix",
    callback: async (event) => {
        // callback is the name of the property that describes the function
        const player = event.player;
        if (!player) return;

        world.sendMessage(`${player.name} is a §cSUSSY BAKA!`);

        player.playSound("pentacore.among_us_trap_remix.adjusted_volume");
    },
});
