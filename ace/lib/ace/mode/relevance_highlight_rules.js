define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var RelevanceHighlightRules = function() {

    // this is not working for now because of single word tokenizer
    var keywords = (
        "does not end with|ends with|does not start with|starts with|is not contained by|is contained by|does not contain|is not greater than or equal to|is greater than or equal to|is not less than or equal to|is less than or equal to|is not less than|is less than|is not greater than|is greater than|is equal to|is not equal to|is not|is|does not equal|equals|contains"
         + "|there do not exist|there does not exist|there exist no|there exists no|exists no|exist no"
         + "|there exists|there exist|exists|exist"
         + "|its"
         + "|of|whose|as|it"
         + "|not"
         + "|and|or"
         + "|if|then|else"
         + "|number"
    );

    var builtinConstants = (
        "true|false"
    );

    var keywordMapper = this.createKeywordMapper({
        "keyword": keywords,
        "constant.language": builtinConstants
    }, "identifier", true);

    this.$rules = {
        "start" : [
            {
                token : "string",
                regex : '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
            }, {
                token : "constant.numeric",
                regex : "[0-9a-fA-F]+\\b"
            },{
                token : keywordMapper,
                regex : "[a-zA-Z]+"
            }, {
                token : "keyword.operator",
                regex : "->|'s?|\\.|-|\\+|;|,|\\*|\\/|mod|&|\\!=|>=|<=|>|<|="
            }, {
                token : "comment",
                regex : "#.*$"
            }, {
                token : "lparen",
                regex : "[(]"
            }, {
                token : "rparen",
                regex : "[)]"
            }, {
                token : "text",
                regex : "\\s+"
            }
        ]
    };
};

oop.inherits(RelevanceHighlightRules, TextHighlightRules);

exports.RelevanceHighlightRules = RelevanceHighlightRules;
});
