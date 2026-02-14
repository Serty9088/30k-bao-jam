import { world } from "@minecraft/server";
import * as f from "../functions.js";
import { LuckyEventType } from "../main.js";

const StructurePlaceOffset = { x: -10, y: -12, z: -10 };

LuckyEventType.register({
    id: 'pyramid',
    callback: (event => {
        world.structureManager.place('bao_30k_pentacore:pyramid', event.player.dimension, f.Vector.sum(event.player.location, StructurePlaceOffset));
    })
});