import * as f from "../functions.js";
import { world } from "@minecraft/server";
import { LuckyEventType } from "../index.js";

LuckyEventType.register({
    callback: (event => {
        world.sendMessage('Mega Super Duper Event');
        world.sendMessage('Location: ' + f.Vector.toString(event.blockLocation));
    })
});