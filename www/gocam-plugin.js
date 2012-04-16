var GocamPlugin = {
    
     nativeFunction: function(types, success, fail) {
          return PhoneGap.exec(success, fail, "GocamPluginClass", "print", types);
     }
};
