import { LuckyEventType as PentacoreEvents } from "./events/pentacore/main.js";

export default {
    author: "Pentacore Team",

    events: [
        ...( // READ THIS:
             // This function randomly selects events from PentacoreEvents using its own algorithm.
             // In order to balance the weight of our events, we added this functions several times (the same number as events)
             // This is NOT to increase our events chances!
            new Array(PentacoreEvents.length).fill(PentacoreEvents.EventFunctionMain)
        )
    ]
}
