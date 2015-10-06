/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var TokenIterator = require("../token_iterator").TokenIterator;
var compiler = require("./relevance/compiler");
var relevance = require("./relevance/relevance");
var docs = require("./relevance/docs").json;

function compile(rel) {
  return compiler.compile(rel);
}

var RelevanceCompletions = function() {
};

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

(function() {
  this.getCompletions = function(state, session, pos, prefix) {
    var line = session.getDocument().getLine(pos.row);
    var prediction = compiler.predict(line, pos.column);
    if (prediction) {
      var ast = prediction[0];
      var typeHintNode = prediction[1];
      if (typeHintNode) {
        console.log(typeHintNode.getDataType().name);
        var allProps = typeHintNode.getDataType().getProperties();
        if (allProps) {
          var hints = [];
          allProps = allProps.filter(function(p) {
            return (p.singularPhrase !== undefined);
          });
          allProps.forEach(function (p) {

            var title = p.key;
            if (p.key.indexOf(" of ") > -1) {
              title = p.key.substr(0, p.key.indexOf(" of "));
            } else {
              title = p.key.substr(0, p.key.indexOf(": "));
            }
            var ref = "<div class='rel-docs'>";
            ref += "<strong style='font-size: 14px'>" + escapeHtml(title) + "</strong>";
            var desc = p.description? p.description : docs[p.key];
            ref += desc;
            ref += "</div>";

            var snippet = p.singularPhrase;
            if (title.indexOf('<') > -1) {
              var properties = title.match(/<\(?(.+)\)?>/)[1].split(', ');
              if (properties.length == 1) {
                if (properties[0] == 'string') {
                  snippet += " \"$0\""
                } else {
                  snippet += " $0"
                }
              } else {
                snippet += " ($0, )";
              }
            }

            hints.push({
              value: title,
              snippet: snippet,
              meta: p.resultType, //typeHintNode.getDataType().name,
              score: Number.MAX_VALUE,
              docHTML: ref
            });
          });
          return hints;
        }
      }
    }
    return [];
  };

}).call(RelevanceCompletions.prototype);

exports.RelevanceCompletions = RelevanceCompletions;
});
