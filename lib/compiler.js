var Parser = require("jison").Parser;
var colors = require("colors");

// functions that can be called in parser
var parserFuncs = {
  cleanupKeyword: function(name) {
    if (name.substr(0, 1) == "$") {
      return name.substr(1);
    }
    return name;
  }
};

var grammar = {
  "lex": {
    "rules": [
      ["\\s+", "/* skip whitespace */"],
      ["\\$?(there do not exist|there does not exist|there exist no|there exists no|exists no|exist no)", "return 'NOT_EXISTS';"],
      ["\\$?(there exists|there exist|exists|exist)", "return 'EXISTS';"],
      ["\\$?(does not end with|ends with|does not start with|starts with|is not contained by|is contained by|does not contain|is not greater than or equal to|is greater than or equal to|is not less than or equal to|is less than or equal to|is not less than|is less than|is not greater than|is greater than|is equal to|is not equal to|is not|is|does not equal|equals|contains|\\!=|>=|<=|>|<|=)", "return 'RELATION';"],
      ["\\$?not", "return 'NOT';"],
      ["\\$?its", "return 'ITS';"],
      ["\\$?it", "return 'IT';"],
      ["\\$?whose", "return 'WHOSE';"],
      ["\\$?as", "return 'AS';"],
      ["\\$?of", "return 'OF';"],
      ["\\$?and", "return 'AND';"],
      ["\\$?or", "return 'OR';"],
      ["\\$?if", "return 'IF';"],
      ["\\$?then", "return 'THEN';"],
      ["\\$?else", "return 'ELSE';"],
      ["\\+", "return '+';"],
      ["->|'s?|\\.", "return '->';"],
      ["-", "return '-';"],
      ["\\(", "return '(';"],
      ["\\)", "return ')';"],
      [";", "return ';';"],
      [",", "return ',';"],
      ["\\*|\\/|mod|&", "return 'PRODUCT_OPERATOR';"],
      ["[0-9]+", "return 'NUMERAL';"],
      ["\"[^\"]*\"", "return 'STRING';"],
      ["[a-zA-Z\\s]*[a-zA-Z]", "return 'PHRASE';"]
    ]
  },

  "bnf": {
    "root":[
      ["expression", "return $1;"]
    ],
    "expression":[
      ["IF expression THEN expression ELSE expression", "$$ = 'if '+$2+' then '+$4+' else '+$6"],
      ["collection", ""]
    ],
    "collection":[
      ["collection ; tuple", "$$ = $1 + '; ' + $3"],
      ["tuple", ""]
    ],
    "tuple":[
      ["or_expression , tuple", "$$ = $1 + ', ' + $3"],
      ["or_expression", ""]
    ],
    "or_expression":[
      ["or_expression OR and_expression", "$$ = $1 + ' or ' + $3"],
      ["and_expression", ""]
    ],
    "and_expression":[
      ["and_expression AND relation_expr", "$$ = $1 + ' and ' + $3"],
      ["relation_expr", ""]
    ],
    "relation_expr": [
      ["sum RELATION sum", "$$ = $1 + ' ' + yy.cleanupKeyword($2) + ' ' + $3"],
      ["sum", ""]
    ],
    "sum": [
      ["sum + product", "$$ = $1 + ' + ' + $3"],
      ["sum - product", "$$ = $1 + ' - ' + $3"],
      ["product", ""]
    ],
    "product": [
      ["product PRODUCT_OPERATOR unary", "$$ = $1 + ' ' + $2 + ' ' + $3"],
      ["unary", ""]
    ],
    "unary": [
      ["EXISTS unary", "$$ = 'exists ' + $2"],
      ["NOT_EXISTS unary", "$$ = 'not exists ' + $2"],
      ["NOT unary", "$$ = 'not ' + $2"],
      ["- unary", "$$ = '- ' + $2"],
      ["cast", ""]
    ],
    "cast": [
      ["cast AS PHRASE", "$$ = $1 + ' as ' + $3"],
      ["property", ""]
    ],
    "property": [
      ["selection OF property", "$$ = $1 + ' of ' + $3"],
      ["selection -> property", "$$ = $3 + ' of ' + $1"],
      ["ITS selection", "$$ = $2 + ' of it'"],
      ["selection", ""]
    ],
    "selection": [
      ["index WHOSE primary", "$$ = $1 + ' whose ' + $3"],
      ["index", ""]
    ],
    "index": [
      ["PHRASE primary", "$$ = $1 + ' ' + $2"],
      ["PHRASE", ""],
      ["primary", ""]
    ],
    "primary": [
      ["( expression )", "$$ = '(' + $2 + ')'"],
      ["STRING", ""],
      ["NUMERAL", ""],
      ["IT", "$$ = 'it'"]
    ]
  }
};

// modify some special keywords to make the lexer simpler
var preprocess = function(rel) {
  var keywords = "does not end with|ends with|does not start with|starts with|is not contained by|is contained by|does not contain|is not greater than or equal to|is greater than or equal to|is not less than or equal to|is less than or equal to|is not less than|is less than|is not greater than|is greater than|is equal to|is not equal to|is not|is|does not equal|equals|contains";
  keywords += "|there do not exist|there does not exist|there exist no|there exists no|exists no|exist no";
  keywords += "|there exists|there exist|exists|exist";
  keywords += "|its";
  keywords += "|of|whose|as|it";
  keywords += "|not";
  keywords += "|and|or";
  keywords += "|if|then|else";
  var pattern = new RegExp("([\\s\\)\\(])("+keywords+")([\\s\\)\\(])","g");
  rel = rel.replace(new RegExp("([\\s\\)\\(])(a|an)([\\s\\)\\(])", "g"), function($0, $1, $2, $3) { return $1+$3 });
  rel = rel.replace(pattern, function($0, $1, $2, $3) { return $1+"$"+$2+$3 });
  return rel;
};

var parser = new Parser(grammar);
//var parserSource = parser.generate();

for (var fn in parserFuncs) {
  parser.yy[fn] = parserFuncs[fn];
}

exports.compile = function(rel) {
  return parser.parse(preprocess(rel));
};


//console.log(exports.compile("folder \"/\"").yellow);
//console.log(exports.compile("system folder -> folders -> files whose (its name contains \"test\")").yellow);
