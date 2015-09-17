define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var RelevanceHighlightRules = require("./relevance_highlight_rules").RelevanceHighlightRules;
var Range = require("../range").Range;
var RelevanceCompletions = require("./relevance_completions").RelevanceCompletions;

var Mode = function() {
    this.HighlightRules = RelevanceHighlightRules;
    this.$completer = new RelevanceCompletions();
};
oop.inherits(Mode, TextMode);

(function() {

    this.lineCommentStart = "//";

    this.$id = "ace/mode/relevance";

    this.getCompletions = function(state, session, pos, prefix) {
        return this.$completer.getCompletions(state, session, pos, prefix);
    };

}).call(Mode.prototype);

exports.Mode = Mode;

});
