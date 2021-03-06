"use strict";

const log = require("./Logging.js").Get("MatrixUser");
/*
 * Represents a user we have seen from Matrix; i.e. a real Matrix user. We
 * don't currently have the ability to create Gitter-side ghosts, so all these
 * users appear via a single relaybot.
 */

function MatrixUser(main, opts) {
    this._main = main;

    this._user_id = opts.user_id;

    this._atime = null; // last activity time in epoch seconds
}

MatrixUser.prototype.userId = function() {
    return this._user_id;
};

// Returns a suitable displayname to identify the user within the given room,
//   taking into account disambiguation with other users in the same room.
MatrixUser.prototype.getDisplaynameForRoom = function(room_id) {
    var my_member_event = this._main.getStoredEvent(
        room_id, "m.room.member", this._user_id
    );

    if (!my_member_event || !my_member_event.content) {
        log.debug("Did not find a member event for " + this._user_id + " in " + room_id);
        return null;
    }

    var displayname = my_member_event.content.displayname;

    if (displayname) {
        // To work out what displayname we can show requires us to work out if
        // the displayname is unique among them all. Which means we need to find
        // them all
        var member_events = this._main.getStoredEvent(
            room_id, "m.room.member"
        );

        var matching = member_events.filter(
            (ev) => ev.content && ev.content.displayname === displayname
        );

        if (matching.length > 1) {
            // Disambiguate
            displayname = displayname + " (" + this._user_id + ")";
        }
    }

    return displayname;
};

MatrixUser.prototype.getATime = function() {
    return this._atime;
};

MatrixUser.prototype.bumpATime = function() {
    this._atime = Date.now() / 1000;
};

module.exports = MatrixUser;
