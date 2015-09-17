var Parser = require("jison").Parser;
var colors = require("colors");

String.prototype.getDataType = function() {
  // we should never need this
  return new RelDataType(this);
};
String.prototype.configScope = function() {
  console.log('scope-str: '+this);
};
String.prototype.debug = function() {
  console.log('debug-str: '+this);
};

var RelDataType = function(name) {
  this.name = name;
};
RelDataType.prototype.getPropType = function(prop) {
  // todo: return the datatype of property
  return new RelDataType("p("+this.name+", "+prop+")");
};
RelDataType.prototype.toString = function() {
  return "[RelevanceType "+this.name+"]";
};

var getCreationDataType = function(name, params) {
  // todo: return creation method datatype
  return new RelDataType("c("+name+")");
};

// models of relevance objects

var RelNode = function() {};
RelNode.prototype.children = [];
RelNode.prototype.scope = null; // the object should it refers to
RelNode.prototype.directAccess = false; // is it a direct "of" access

RelNode.prototype.getDataType = function() {
  throw new Error("Unimplemented getDataType at " + this);
};

RelNode.prototype.configScope = function() {
  for (var i in this.children) {
    var child = eval("this."+this.children[i]);
    if ((child !== null) && (child !== undefined)) {
      child.scope = this.scope;
      child.directAccess = false;
    }
  }
};

RelNode.prototype.debug = function() {
  console.log("------------------------------");
  console.log("Node: " + this);
  console.log("Data type: " + this.getDataType());
  console.log("Scope: " + this.scope);
  console.log("Direct access: " + this.directAccess);
  console.log("------------------------------");
};

/**
 * String in double quotes
 *    "something"
 */
var RelString = function(str) {
  var m = str.match(/^"(.*)"$/);
  if (m) {
    str = m[1];
  }
  this.str = str;
};
RelString.prototype = new RelNode();

RelString.prototype.toString = function() {
  return "\"" + this.str + "\"";
};

RelString.prototype.getDataType = function() {
  return new RelDataType("string");
};

/**
 * Number
 */
var Numeral = function(value) {
  this.value = value;
};
Numeral.prototype = new RelNode();

Numeral.prototype.toString = function() {
  return this.value;
};

Numeral.prototype.getDataType = function() {
  return new RelDataType("number");
};


/**
 * A property of another object
 *    source -> prop [whose (...)]*
 */
var Property = function(prop, source) {
  this.prop = prop;
  this.source = source;
};
Property.prototype = new RelNode();

Property.prototype.children = ["prop", "source"];

Property.prototype.toString = function() {
  return this.prop + " of " + this.source;
};

Property.prototype.getDataType = function() {
  var sourceType = this.source.getDataType();
  if (this.prop instanceof Phrase) {
    return sourceType.getPropType(this.prop.name, this.prop.params);
  }
  return this.prop.getDataType();
};

Property.prototype.configScope = function() {
  this.source.scope = this.scope;
  this.prop.scope = this.source;
  this.prop.directAccess = true;
};

/**
 * Whose clause
 *    something whose (something)
 */
var Whose = function(source, filter) {
  this.source = source;
  this.filter = filter;
};
Whose.prototype = new RelNode();

Whose.prototype.children = ["source", "filter"];

Whose.prototype.toString = function() {
  return this.source + " whose " + this.filter;
};

Whose.prototype.getDataType = function() {
  // Its datatype is the same as the source
  return this.source.getDataType();
};

Whose.prototype.configScope = function() {
  this.source.scope = this.scope;
  this.source.directAccess = this.directAccess;
  this.filter.scope = this.source;
};


/**
 * Simply it
 */
var It = function() {};
It.prototype = new RelNode();

It.prototype.children = [];

It.prototype.toString = function() {
  return "it";
};

It.prototype.getDataType = function() {
  // it refers to the scope, so its data type is the same as the scope
  return this.scope.getDataType();
};


/**
 * A phrase is a property or creation method name.
 * Params are optional
 */
var Phrase = function(name, params) {
  this.name = name;
  this.params = params;
};
Phrase.prototype = new RelNode();

Phrase.prototype.children = ["params"];

Phrase.prototype.directAccess = false;

Phrase.prototype.scope = null;

Phrase.prototype.toString = function() {
  if (this.params === null) {
    return this.name;
  }
  return this.name + " " + this.params;
};

Phrase.prototype.getDataType = function() {
  if (typeof this.name == "string") {
    if (this.directAccess) {
      var sourceType = this.scope.getDataType();
      return sourceType.getPropType(this.name, this.params);
    } else {
      return getCreationDataType(this.name, this.params);
    }
  } else {
    throw new Error("Invalid phrase");
  }
};


/**
 * Anything wrapped in parentheses
 *  (something)
 */
var Parens = function(content) {
  this.content = content;
};
Parens.prototype = new RelNode();

Parens.prototype.children = ["content"];

Parens.prototype.toString = function() {
  return "(" + this.content + ")";
};

Parens.prototype.getDataType = function() {
  return this.content.getDataType();
};


/**
 * Data type casting
 *  something as type
 */
var Cast = function(source, type) {
  this.source = source;
  this.type = type;
};
Cast.prototype = new RelNode();

Cast.prototype.children = ["source"];

Cast.prototype.toString = function() {
  return this.source + " as " + this.type;
};

Cast.prototype.getDataType = function() {
  // we don't care about the source data type,
  // only use the requested type
  return new RelDataType(this.type.toString());
};


/**
 * Unary operator
 *  exists something
 */
var Unary = function(source, op) {
  this.source = source;
  this.op = op;
};
Unary.prototype = new RelNode();

Unary.prototype.children = ["source"];

Unary.prototype.toString = function() {
  return this.op + " " + this.source;
};

Unary.prototype.getDataType = function() {
  return new RelDataType("boolean");
};


// AST traversal
var traverseTree = function(node, funcName) {
  eval("node."+funcName+"();");
  for (var i in node.children) {
    var child = eval("node."+node.children[i]);
    if ((child !== null) && (child !== undefined)) {
      traverseTree(child, funcName);
    }
  }
};

// functions that can be called in parser
var parserFuncs = {
  cleanupKeyword: function(name) {
    if (name.substr(0, 1) == "$") {
      return name.substr(1);
    }
    return name;
  },
  String: RelString,
  Numeral: Numeral,
  It: It,
  Property: Property,
  Whose: Whose,
  Phrase: Phrase,
  Parens: Parens,
  Cast: Cast,
  Unary: Unary
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
      ["\\$it", "return 'IT';"],
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
      ["EXISTS unary", "$$ = new yy.Unary($2, 'exists')"],
      ["NOT_EXISTS unary", "$$ = new yy.Unary($2, 'not exists')"],
      ["NOT unary", "$$ = new yy.Unary($2, 'not')"],
      ["- unary", "$$ = new yy.Unary($2, '-')"],
      ["cast", ""]
    ],
    "cast": [
      ["cast AS PHRASE", "$$ = new yy.Cast($1, $3)"],
      ["property", ""]
    ],
    "property": [
      //["selection OF property", "$$ = new yy.Property($1, $3)"],
      ["property -> selection", "$$ = new yy.Property($3, $1)"],
      ["property -> EXISTS", "$$ = new yy.Unary($1, 'exists')"],
      ["property -> NOT_EXISTS", "$$ = new yy.Unary($1, 'not exists')"],
      ["ITS selection", "$$ = new yy.Property($2, new yy.It())"],
      ["selection", ""]
    ],
    "selection": [
      ["index WHOSE primary", "$$ = new yy.Whose($1, $3)"],
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
ast = exports.compile("system folder -> folders -> files whose (its name contains \"test\") -> (its name) -> exists");
traverseTree(ast, "configScope");
traverseTree(ast, "debug");
console.log(ast.toString().yellow);
console.log(ast.getDataType().toString().red);
