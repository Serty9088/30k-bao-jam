import { LuckyEventType as PentacoreEvents } from "./events/pentacore/index.js";

export default {
    author: "Pentacore Team",

    events: [
        ...( // READ THIS:
             // This function just triggers a random event from our events list
             // This is NOT to increase our events chances and the weight of all events is the same!
            new Array(PentacoreEvents.getAll().length).fill(PentacoreEvents.EventFunctionMain)
        )
    ]
}
