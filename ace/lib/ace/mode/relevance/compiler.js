define(function(require, exports, module) {
  "use strict";

var parser = require("./parser");
  parser = window.parser;

  var relevance = require("./relevance");

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
    return new RelDataType(relevance.getPropType(this.name, prop, params).resultType);
    //return new RelDataType("p("+this.name+", "+prop+")");
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
    return new RelDataType(relevance.getCreationDataType(name, params).resultType);
    //return new RelDataType("c("+name+")");
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

RelNode.prototype.toColorfulRel = function() {
  return this.toString();
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
 * Special marker node to get type hint
 *
 * @constructor
 */
var TypeHint = function() {
  selectedNode = this;
};
TypeHint.prototype = new RelNode();

TypeHint.prototype.toString = function() {
  return "?";
};

TypeHint.prototype.getDataType = function() {
  if (!this.directAccess) {
    return new RelDataType("world");
  }
  return this.scope.getDataType();
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

RelString.prototype.toColorfulRel = function() {
  return this.toString().green;
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

Numeral.prototype.toColorfulRel = function() {
  return this.toString().green;
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

Property.prototype.toColorfulRel = function() {
  return this.prop.toColorfulRel() + " of ".yellow + this.source.toColorfulRel();
};

Property.prototype.getDataType = function() {
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

Whose.prototype.toColorfulRel = function() {
  return this.source.toColorfulRel() + " whose ".yellow + this.filter.toColorfulRel();
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

It.prototype.toColorfulRel = function() {
  return this.toString().green;
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

Parens.prototype.toColorfulRel = function() {
  return "(" + this.content.toColorfulRel() + ")";
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

Cast.prototype.toColorfulRel = function() {
  return this.source.toColorfulRel() + " as ".yellow + this.type.toColorfulRel();
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

Unary.prototype.toColorfulRel = function() {
  return this.op.toString().yellow + " " + this.source.toColorfulRel();
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

BinaryOp.prototype.toColorfulRel = function() {
  return this.left.toColorfulRel() + " " + this.op.toString().yellow + " " + this.right.toColorfulRel();
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

Tuple.prototype.toColorfulRel = function() {
  return this.children.map(function(c) {return c.toColorfulRel()}).join(", ");
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

Collection.prototype.toColorfulRel = function() {
  return this.children.map(function(c) {return c.toColorfulRel()}).join("; ");
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

IfExp.prototype.toColorfulRel = function() {
  return "if ".yellow + this.ifCondition.toColorfulRel() + " then ".yellow + this.thenExp.toColorfulRel() + " else ".yellow + this.elseExp.toColorfulRel();
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
  IfExp: IfExp,
  TypeHint: TypeHint
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
  keywords += "|mod";
  keywords += "|if|then|else";
  var pattern = new RegExp("([\\s\\)\\(])("+keywords+")([\\s\\)\\(])","g");
  rel = rel.replace(new RegExp("([\\s\\)\\(])(a|an)([\\s\\)\\(])", "g"), function($0, $1, $2, $3) { return $1+$3 });
  rel = rel.replace(pattern, function($0, $1, $2, $3) { return $1+"$"+$2.replace(/\s/g, "-")+$3 });
  rel = rel.replace(pattern, function($0, $1, $2, $3) { return $1+"$"+$2.replace(/\s/g, "-")+$3 });
  return rel;
};

for (var fn in parserFuncs) {
  parser.yy[fn] = parserFuncs[fn];
}

  exports.compile = function(rel) {
    selectedNode = null;
    var ast = parser.parse(preprocess(rel));
    traverseTree(ast, "configScope");
    return ast;
  };

  exports.selectedNode = function(rel) {
    return selectedNode;
  };

  exports.predict = function(rel, position) {
    // todo: should remove the corresponding token
    var pre = rel.substr(0, position);
    var post = rel.substr(position);
    while (pre.length > 0) {
      if ([' ', '.', ')', '('].indexOf(pre.charAt(pre.length - 1)) == -1){
        pre = pre.substr(0, pre.length - 1);
      } else {
        break;
      }
    }
    while (post.length > 0) {
      if ([' ', '.', ')', '('].indexOf(post.charAt(0)) == -1){
        post = post.substr(1);
      } else {
        break;
      }
    }
    rel = pre + "?" + post;

    // try to add close brace to make the relevance valid if it isn't
    var maxTries = 3;
    var ast = null;
    while (maxTries > 0) {
      try {
        ast = exports.compile(rel);
        break;
      } catch (error) {
        rel += ")";
        maxTries--;
      }
    }
    return [ast, selectedNode];
  };

});