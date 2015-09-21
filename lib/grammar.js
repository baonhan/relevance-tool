var Parser = require("jison").Parser;

var grammar = {
  "lex": {
    "rules": [
      ["\\s+", "/* skip whitespace */"],
      ["\\$?(there-do-not-exist|there-does-not-exist|there-exist-no|there-exists-no|exists-no|exist-no)", "return 'NOT_EXISTS';"],
      ["\\$?(there-exists|there-exist|exists|exist)", "return 'EXISTS';"],
      ["\\$?(does-not-end-with|ends-with|does-not-start-with|starts-with|is-not-contained-by|is-contained-by|does-not-contain|is-not-greater-than-or-equal-to|is-greater-than-or-equal-to|is-not-less-than-or-equal-to|is-less-than-or-equal-to|is-not-less-than|is-less-than|is-not-greater-than|is-greater-than|is-equal-to|is-not-equal-to|is-not|is|does-not-equal|equals|contains|\\!=|>=|<=|>|<|=)", "return 'RELATION';"],
      ["\\$not", "return 'NOT';"],
      ["\\$its", "return 'ITS';"],
      ["\\$it", "return 'IT';"],
      ["\\$whose", "return 'WHOSE';"],
      ["\\$as", "return 'AS';"],
      ["\\$of", "return 'OF';"],
      ["\\$and", "return 'AND';"],
      ["\\$or", "return 'OR';"],
      ["\\$if", "return 'IF';"],
      ["\\$then", "return 'THEN';"],
      ["\\$else", "return 'ELSE';"],
      ["\\+", "return '+';"],
      ["->|'s?|\\.", "return '->';"],
      ["-", "return '-';"],
      ["\\(", "return '(';"],
      ["\\)", "return ')';"],
      [";", "return ';';"],
      [",", "return ',';"],
      ["\\*|\\/|\\$mod|&", "return 'PRODUCT_OPERATOR';"],
      ["[0-9]+", "return 'NUMERAL';"],
      ["\"[^\"]*\"", "return 'STRING';"],
      ["[a-zA-Z][a-zA-Z0-9_\\s]*[a-zA-Z0-9]", "return 'PHRASE';"],
      ["\\?", "return '?';"]
    ]
  },

  "bnf": {
    "root":[
      ["expression", "return $1;"]
    ],
    "expression":[
      ["IF expression THEN expression ELSE expression", "$$ = new yy.IfExp($2, $4, $6)"],
      ["collection", ""]
    ],
    "collection":[
      ["collection ; tuple", "$$ = new yy.Collection($1, $3)"],
      ["tuple", ""]
    ],
    "tuple":[
      ["or_expression , tuple", "$$ = new yy.Tuple($1, $3)"],
      ["or_expression", ""]
    ],
    "or_expression":[
      ["or_expression OR and_expression", "$$ = new yy.BinaryOp($1, $3, 'or')"],
      ["and_expression", ""]
    ],
    "and_expression":[
      ["and_expression AND relation_expr", "$$ = new yy.BinaryOp($1, $3, 'and')"],
      ["relation_expr", ""]
    ],
    "relation_expr": [
      ["sum RELATION sum", "$$ = new yy.BinaryOp($1, $3, yy.cleanupKeyword($2))"],
      ["sum", ""]
    ],
    "sum": [
      ["sum + product", "$$ = new yy.BinaryOp($1, $3, '+')"],
      ["sum - product", "$$ = new yy.BinaryOp($1, $3, '-')"],
      ["product", ""]
    ],
    "product": [
      ["product PRODUCT_OPERATOR unary", "$$ = new yy.BinaryOp($1, $3, $2)"],
      ["unary", ""]
    ],
    "unary": [
      ["EXISTS unary", "$$ = new yy.Unary($2, 'exists')"],
      ["NOT_EXISTS unary", "$$ = new yy.Unary($2, 'not exists')"],
      ["NOT unary", "$$ = new yy.Unary($2, 'not')"],
      ["- unary", "$$ = new yy.Unary($2, '-')"],
      ["cast", ""]
    ],
    "cast": [
      ["cast AS PHRASE", "$$ = new yy.Cast($1, $3)"],
      ["r_property", ""]
    ],
    "r_property": [
      ["selection OF r_property", "$$ = new yy.Property($1, $3)"],
      ["property", ""]
    ],
    "property": [
      ["property -> selection", "$$ = new yy.Property($3, $1)"],
      ["property -> EXISTS", "$$ = new yy.Unary($1, 'exists')"],
      ["property -> NOT_EXISTS", "$$ = new yy.Unary($1, 'not exists')"],
      ["ITS selection", "$$ = new yy.Property($2, new yy.It())"],
      ["selection", ""]
    ],
    "selection": [
      ["index WHOSE primary", "$$ = new yy.Whose($1, $3)"],
      ["?", "$$ = new yy.TypeHint()"],
      ["index", ""]
    ],
    "index": [
      ["PHRASE primary", "$$ = new yy.Phrase($1, $2)"],
      ["PHRASE", "$$ = new yy.Phrase($1, null)"],
      ["primary", ""]
    ],
    "primary": [
      ["( expression )", "$$ = new yy.Parens($2)"],
      ["STRING", "$$ = new yy.String($1)"],
      ["NUMERAL", "$$ = new yy.Numeral($1)"],
      ["IT", "$$ = new yy.It()"]
    ]
  }
};


var parser = new Parser(grammar);
var parserSource = parser.generate();
console.log(parserSource);

