(function() {
  var relJsonPath = "../relevance-language.json",
      relJson = require(relJsonPath),
      typeParentMapping = {},
      pluralSingularMapping = {},
      index = {};

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
      //console.log(keyName);
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
    console.log(keyName);
    return index[keyName];
  };

  console.log(exports.getPropType("file", "name"));

}).call(this);
