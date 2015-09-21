define(function(require, exports, module) {
  "use strict";

  var relJson = require("./relevance-language").json,
      typeParentMapping = {},
      pluralSingularMapping = {},
      index = {},
      typeIndex = {};

  var processKey = function(str) {
    return str.split(":")[0].trim();
  };

  var convertToSingular = function(str) {
    if(pluralSingularMapping[str]) {
      return pluralSingularMapping[str];
    }
    return str;
  };

  var getParent = function(str) {
    if(typeParentMapping[str]) {
      return typeParentMapping[str];
    }
    return str;
  };

  for(var k in relJson["types"]) {
    var v = relJson["types"][k];

    if(v["parent"]) {
      typeParentMapping[k] = v["parent"];
    }
  }

  for(var k in relJson["properties"]) {
    var v = relJson["properties"][k];

    if(v["pluralPhrase"] && v["singularPhrase"]) {
      pluralSingularMapping[v.pluralPhrase] = v.singularPhrase;
    }

    index[processKey(k)] = v;
    if(v["directObjectType"]) {
      if(!typeIndex[v.directObjectType]) {
        typeIndex[v.directObjectType] = [];
      }
      typeIndex[v.directObjectType].push(v);
    }
  }

  exports.getPropType = function(type, prop, params) {
    type = convertToSingular(type);
    prop = convertToSingular(prop);
    params = convertToSingular(params);

    var keyName, parentType;
    do {
      keyName = prop;
      if(params) {
        keyName = keyName + " <" + params + ">";
      }
      keyName = keyName + " of <" + type + ">";
      parentType = getParent(type);
      type = parentType;
    } while (!index[keyName]);
    return index[keyName];
  };

  exports.getCreationDataType = function(name, params) {
    name = convertToSingular(name);
    params = convertToSingular(params);

    var keyName = name;
    if(params) {
      keyName = keyName + " <" + params + ">";
    }
    return index[keyName];
  };

  exports.getAllPropType = function(type) {
    if(type == "world") {
      var worldArray = [];
      for(var k in index) {
        worldArray.push(index[k]);
      }
      return worldArray;
    }
    type = convertToSingular(type);

    var parentType, resultArray = [];
    do {
      resultArray = resultArray.concat(typeIndex[type]);
      parentType = getParent(type);
      type = parentType;
    } while (parentType != type);
    return resultArray;
  };

});
