(function() {
  var relJsonPath = "../relevance-language.json",
      relJson = require(relJsonPath),
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

    var keyName = prop;
    if(params) {
      keyName = keyName + " <" + params + ">";
    }
    keyName = keyName + " of <" + type + ">";
    console.log(keyName);
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

  console.log(exports.getCreationDataType("folders", "string"));

}).call(this);
