define(function(require, exports, module) {
  "use strict";

  var relJson = require("./relevance-language").json,
      platformVersionEmu = {},
      typeParentMapping = {},
      pluralSingularMapping = {},
      keyIndex = {},
      typeIndex = {};

  var getSingular = function(plural) {
    return pluralSingularMapping[plural] ? pluralSingularMapping[plural] : plural;
  };

  var getParent = function(type) {
    return typeParentMapping[type] ? typeParentMapping[type] : type;
  };

  var addPlatformVersionEmu = function(property_json) {
    for(var ver in property_json["availability"]) {
      for(var pf in property_json["availability"][ver]) {
        if(!platformVersionEmu[property_json["availability"][ver][pf]]) {
          platformVersionEmu[property_json["availability"][ver][pf]] = [];
        }
        if(platformVersionEmu[property_json["availability"][ver][pf]].indexOf(ver) < 0) {
          platformVersionEmu[property_json["availability"][ver][pf]].push(ver);
        }
      }
    }
  };

  var addKeyIndex = function(property_json) {
    if(property_json.type !== "property") {
      return;
    }

    var keyName = property_json.key.split(":")[0].trim();
    keyIndex[keyName] = property_json;
  };

  var addTypeIndex = function(property_json) {
    if(property_json.type !== "property") {
      return;
    }

    if(property_json["directObjectType"]) {
      if(!typeIndex[property_json.directObjectType]) {
        typeIndex[property_json.directObjectType] = [];
      }
      typeIndex[property_json.directObjectType].push(property_json);
    } else {
      if(!typeIndex["WORLD_TYPE"]) {
        typeIndex["WORLD_TYPE"] = [];
      }
      typeIndex["WORLD_TYPE"].push(property_json);
    }
  };

  var addTypeParentMapping = function(type_json) {
    if(type_json["parent"]) {
      typeParentMapping[type_json.name] = type_json["parent"];
    }
  };

  var addPluralSingularMapping = function(property_json) {
    if(property_json["pluralPhrase"] && property_json["singularPhrase"]) {
      pluralSingularMapping[property_json.pluralPhrase] = property_json.singularPhrase;
    }
  };

  var compareVersion = function(ver1, ver2) {
    var arr1 = ver1.split("."),
      arr2 = ver2.split("."),
      max = arr1.length > arr2.length ? arr1.length : arr2.length,
      i, cur1, cur2;

    for(i = 0;i < max;i += 1) {
      cur1 = arr1[i] ? parseInt(arr1[i]) : 0;
      cur2 = arr2[i] ? parseInt(arr2[i]) : 0;
      if (cur1 !== cur2) {
        return cur1 > cur2 ? 1 : -1;
      }
    }

    return 0;
  };

  var isVersionPlatformComplied = function(json, version, platform) {
    version = typeof version == "undefined" ? "ALL" : version;
    platform = typeof platform == "undefined" ? "ALL" : platform;

    for(var ver in json["availability"]) {
      var platformArr = json["availability"][ver];
      platformArr.includes = function(str) {
        for(var i in this) {
          if (this[i] === str) {
            return true;
          }
        }
        return false;
      };

      if(version === "ALL" || compareVersion(version, ver) >= 0) {
        if(platform === "ALL" || platformArr.includes(platform)) {
          return true;
        }
      }
    }
    return false;
  };

  exports.buildIndex = function(version, platform) {
    platformVersionEmu = {};
    typeParentMapping = {};
    pluralSingularMapping = {};
    keyIndex = {};
    typeIndex = {};

    for(var k in relJson["types"]) {
      var v = relJson["types"][k];

      addPlatformVersionEmu(v);
      if(isVersionPlatformComplied(v, version, platform)) {
        addTypeParentMapping(v);
      }
    }

    for(var k in relJson["properties"]) {
      var v = relJson["properties"][k];

      addPlatformVersionEmu(v);
      if(isVersionPlatformComplied(v, version, platform)) {
        addPluralSingularMapping(v);
        addKeyIndex(v);
        addTypeIndex(v);
      }
    }
  };

  exports.getPlatformVersionEmu = function() {
    return platformVersionEmu;
  };

  exports.getPropType = function(type, prop, params) {
    type = getSingular(type);
    prop = getSingular(prop);
    params = getSingular(params);

    var keyName, parentType;
    do {
      keyName = prop;
      if(params) {
        keyName = keyName + " <" + params + ">";
      }
      keyName = keyName + " of <" + type + ">";
      parentType = getParent(type);
      type = parentType;
    } while (!keyIndex[keyName]);
    return keyIndex[keyName];
  };

  exports.getCreationDataType = function(name, params) {
    name = getSingular(name);
    params = getSingular(params);

    var keyName = name;
    if(params) {
      keyName = keyName + " <" + params + ">";
    }
    return keyIndex[keyName];
  };

  exports.getAllPropType = function(type) {
    if(type == "world") {
      return typeIndex["WORLD_TYPE"] ? typeIndex["WORLD_TYPE"] : [];
    }

    type = getSingular(type);
    var parentType = type,
      resultArray = [];
    do {
      type = parentType;
      if(typeIndex[type]) {
        resultArray = resultArray.concat(typeIndex[type]);
      }
      parentType = getParent(type);
    } while (parentType != type);
    return resultArray;
  };

  //TODO: binaryOP

  //TODO: unaryOP

  //TODO: cast

  exports.buildIndex();

});
