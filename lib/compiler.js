var Parser = require("jison").Parser;
var colors = require("colors");

/*************************************************************
 *               Methods for data type search
 *************************************************************/

/**
 * Represents a simple data type
 *
 * @param name
 * @constructor
 */
var RelDataType = function(name) {
  this.name = name;
};
RelDataType.prototype.getPropType = function(prop, params) {
  // todo: return the datatype of property
  return new RelDataType("p("+this.name+", "+prop+")");
};
RelDataType.prototype.toString = function() {
  return "[RelevanceType "+this.name+"]";
};

/**
 * Represents tuple data type. It has an array of child data types.
 * Each child type is a RelDataType
 *
 * @param childTypes
 * @constructor
 */
var RelTupleDataType = function(childTypes) {
  this.children = childTypes;
};
RelTupleDataType.prototype.getPropType = function(prop, params) {
  // todo: handle "item # of it"
  return new RelDataType("p(tuple, "+prop+")");
};
RelTupleDataType.prototype.toString = function() {
  return "[RelevanceType Tuple]";
};

/**
 * Retrieves data type of creator method
 * @param name
 * @param params
 * @returns {RelDataType}
 */
var getCreationDataType = function(name, params) {
  name = name.toLowerCase();
  if ((name === "true") || (name === "false")){
    return new RelDataType("boolean");
  }
  // todo: return creation method datatype
  return new RelDataType("c("+name+")");
};

/**
 * Retrieves data type of binary operator
 *
 * @param leftType
 * @param rightType
 * @param operator
 * @returns {RelDataType}
 */
var getBinaryOpDataType = function(leftType, rightType, operator) {
  var relationOp = /does not end with|ends with|does not start with|starts with|is not contained by|is contained by|does not contain|is not greater than or equal to|is greater than or equal to|is not less than or equal to|is less than or equal to|is not less than|is less than|is not greater than|is greater than|is equal to|is not equal to|is not|is|does not equal|equals|contains|\\!=|>=|<=|>|<|=|and|or/;
  if (operator.match(relationOp)) {
    return new RelDataType("boolean");
  }
  // todo: return datatype for other binary operators: +, -, /, *, &, mod
  return new RelDataType("b("+operator+")");
};

/*************************************************************
 *                Models for all AST nodes
 *************************************************************/

/**
 * Stores the node that we want to get its data type
 * @type {RelNode}
 */
var selectedNode = null;

/**
 * Base node. All other nodes must extends this.
 *
 * @constructor
 */
var RelNode = function() {};

/**
 * List of child elements that should have scope propagated down
 * They can be a list of properties or their name.
 * @type {Array}
 */
RelNode.prototype.children = [];

// the object should it refers to
RelNode.prototype.scope = null;

// is it a direct "of" access
RelNode.prototype.directAccess = false;

RelNode.prototype.getDataType = function() {
  throw new Error("Unimplemented getDataType at " + this);
};

RelNode.prototype.configScope = function() {
  for (var i in this.children) {
    var child = this.children[i];
    if (typeof child == "string") {
      child = eval("this."+child);
    }
    if ((child !== null) && (child !== undefined)) {
      child.scope = this.scope;
      child.directAccess = false;
    }
  }
};

/**
 * mark the node or its scope so that we can show type hint later
 */
RelNode.prototype.markTypeHint = function() {
  selectedNode = this;
};

RelNode.prototype.markWorldTypeHint = function() {
  selectedNode = new World(this.scope);
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
 * Represents the world
 *
 * @param scope
 * @constructor
 */
var World = function(scope) {
  this.scope = scope;
};
World.prototype = new RelNode();

World.prototype.getDataType = function() {
  return new RelDataType("world");
};

/**
 * String in double quotes
 *    "something"
 *
 * @constructor
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
 *
 * @constructor
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
 *
 * @constructor
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
 *
 * @constructor
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
 *
 * @constructor
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
 *
 * @constructor
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
 *
 * @constructor
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
 *
 * @constructor
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
 *
 * @constructor
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


/**
 * Binary operator
 *  something + something
 *
 * @constructor
 */
var BinaryOp = function(left, right, op) {
  this.left = left;
  this.right = right;
  this.op = op;
};
BinaryOp.prototype = new RelNode();

BinaryOp.prototype.children = ["left", "right"];

BinaryOp.prototype.toString = function() {
  return this.left + " " + this.op + " " + this.right;
};

BinaryOp.prototype.getDataType = function() {
  var leftType = this.left.getDataType();
  var rightType = this.right.getDataType();
  return getBinaryOpDataType(leftType, rightType, this.op);
};


/**
 * Tuple
 *  something[, something]+
 *
 * @constructor
 */
var Tuple = function(item, other) {
  this.children = [item];
  if (other instanceof Tuple) {
    this.children = this.children.concat(other.children);
  } else {
    this.children = this.children.concat(other);
  }
};
Tuple.prototype = new RelNode();

Tuple.prototype.toString = function() {
  return this.children.join(", ");
};

Tuple.prototype.getDataType = function() {
  var childTypes = this.children.map(function(c) { return c.getDataType() });
  return new RelTupleDataType(childTypes);
};


/**
 * Collection (aka Plural Results)
 *  something[; something]+
 *
 * @constructor
 */
var Collection = function(item, other) {
  this.children = [item];
  if (other instanceof Collection) {
    this.children = this.children.concat(other.children);
  } else {
    this.children = this.children.concat(other);
  }
};
Collection.prototype = new RelNode();

Collection.prototype.toString = function() {
  return this.children.join("; ");
};

Collection.prototype.getDataType = function() {
  // todo: validate children have same data types
  return this.children[0].getDataType();
};


/**
 * If then else expression
 *  if ... then ... else ...
 *
 * @constructor
 */
var IfExp = function(ifCondition, thenExp, elseExp) {
  this.ifCondition = ifCondition;
  this.thenExp = thenExp;
  this.elseExp = elseExp;
};
IfExp.prototype = new RelNode();

IfExp.prototype.children = ["ifCondition", "thenExp", "elseExp"];

IfExp.prototype.toString = function() {
  return "if " + this.ifCondition + " then " + this.thenExp + " else " + this.elseExp;
};

IfExp.prototype.getDataType = function() {
  // todo: validate thenExp and elseExp have the same data type
  return this.thenExp.getDataType();
};


/*************************************************************
 *                   Language grammar
 *************************************************************/

// AST traversal
var traverseTree = function(node, funcName) {
  eval("node."+funcName+"();");
  for (var i in node.children) {
    var child = node.children[i];
    if (typeof child == "string") {
      child = eval("node."+child);
    }
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
    name = name.replace(/-/g, " ");
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
  Unary: Unary,
  BinaryOp: BinaryOp,
  Tuple: Tuple,
  Collection: Collection,
  IfExp: IfExp
};

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
      ["\\*|\\/|mod|&", "return 'PRODUCT_OPERATOR';"],
      ["[0-9]+", "return 'NUMERAL';"],
      ["\"[^\"]*\"", "return 'STRING';"],
      ["[a-zA-Z\\s]*[a-zA-Z]", "return 'PHRASE';"],
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
      ["property -> ?", "$1.markTypeHint()"],
      ["ITS selection", "$$ = new yy.Property($2, new yy.It())"],
      ["ITS ?", "var it = new yy.It(); it.markTypeHint(); $$ = it"],
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
      ["IT", "$$ = new yy.It()"],
      ["?", "var hint = new yy.String('?'); hint.markWorldTypeHint(); $$ = hint;"]
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
  rel = rel.replace(pattern, function($0, $1, $2, $3) { return $1+"$"+$2.replace(/\s/g, "-")+$3 });
  rel = rel.replace(pattern, function($0, $1, $2, $3) { return $1+"$"+$2.replace(/\s/g, "-")+$3 });
  return rel;
};

var parser = new Parser(grammar);
//var parserSource = parser.generate();

for (var fn in parserFuncs) {
  parser.yy[fn] = parserFuncs[fn];
}

exports.compile = function(rel) {
  selectedNode = null;
  return parser.parse(preprocess(rel));
};


//ast = exports.compile("system folder -> folders -> files whose (its name contains \"test\") -> (its name) -> exists");
//ast = exports.compile("(computer -> name starts with \"test\") and (4 > 5) whose (test of it)");
//ast = exports.compile("system folder -> files -> (its name, its size) -> (its item 1)");
//ast = exports.compile("(\"test\", (2;5;6;8))");
//ast = exports.compile("system folder -> files -> (its name, (if (its size >1000) then \"big\" else \"small\"))");
//ast = exports.compile("system folder -> files -> (name of it, size of it) whose (its item 1 > ?)");
//ast = exports.compile("system folder -> files -> (name of it, size of it) whose (its ?)");
ast = exports.compile("system folder -> files -> (name of it, size of it) whose (its item 1 > \"test\" -> ?)");
traverseTree(ast, "configScope");
traverseTree(ast, "debug");
console.log(ast.toString().yellow);
console.log(ast.getDataType().toString().red);
if (selectedNode) {
  console.log(("Type hint: "+selectedNode.getDataType()).green);
}
