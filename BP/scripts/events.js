/*
  This file defines which events you have added to the lucky block.
*/

import { LuckyEventType as PentacoreEvents } from "./events/pentacore"

export default {
    // Make sure to replace this with your own username!
    author: "Pentacore Team",

    // When you've created your own events, import at the top of the file and add them to the array below.
    events: [
        PentacoreEvents.EventFunctionMain
    ]
}
