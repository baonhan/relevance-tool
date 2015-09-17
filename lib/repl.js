
(function() {
  var compiler, addHistory, addMultilineHandler, autocomplete, fs, getCommandId, merge, nodeREPL, path, qna, ref, replDefaults, updateSyntaxError, vm;

  fs = require('fs');
  path = require('path');
  vm = require('vm');
  nodeREPL = require('repl');
  ref = require('./helpers'), merge = ref.merge, updateSyntaxError = ref.updateSyntaxError;
  colors = require('colors');
  compiler = require('./compiler');
  qna = require('./qna');

  var showRelevance = false;
  var showError = false;

  replDefaults = {
    prompt: 'Q: ',
    historyFile: process.env.HOME ? path.join(process.env.HOME, '.relevance_history') : void 0,
    historyMaxInputSize: 10240,
    "eval": function(input, context, filename, cb) {
      input = input.replace(/\uFF00/g, '\n');
      input = input.replace(/^\(([\s\S]*)\n\)$/m, '$1');
      if (input === "show relevance") {
        showRelevance = true;
        return cb(null, 'ok');
      }
      if (input === "hide relevance") {
        showRelevance = false;
        return cb(null, 'ok');
      }
      if (input === "show error") {
        showError = true;
        return cb(null, 'ok');
      }
      if (input === "hide error") {
        showError = false;
        return cb(null, 'ok');
      }
      if (input === "") {
        return cb(null, "");
      }
      try {
        var rel = compiler.compile(input);
        if (showRelevance) {
          console.log(rel.toColorfulRel());
        }
        return qna.eval(rel, function(answers, type) {
          return cb(null, answers);
        });
      } catch (error) {
        updateSyntaxError(error, input);
        if (showError) {
          return cb(error);
        } else {
          return cb("Error in relevance");
        }
      }
    }
  };

  autocomplete = function(line, cb) {
    var err, error, exp, matches, prefix, rel;
    if (matches = line.match(/^(.+)(\.|->)\s*([a-zA-Z0-9\s]*)$/)) {
      exp = matches[1];
      prefix = matches[3];
      try {
        rel = compiler.compile(exp);
        return qna["eval"](rel, function(answers, type) {
          if (type) {
            return qna.propertiesOf(type, function(props) {
              var matchingProps = props.filter(function(p) {
                return p[0].indexOf(prefix) === 0;
              }).map(function(p) {
                return p[0];
              });
              cb(null, [matchingProps, prefix]);
            });
          } else {
            cb(null, [[], prefix]);
          }
        });
      } catch (error) {
        err = error;
        return cb(null, [[], prefix]);
      }
    } else {
      return cb(null, [[], '']);
    }
  };

  addMultilineHandler = function(repl) {
    var inputStream, multiline, nodeLineListener, origPrompt, outputStream, ref1, rli;
    rli = repl.rli, inputStream = repl.inputStream, outputStream = repl.outputStream;
    origPrompt = (ref1 = repl._prompt) != null ? ref1 : repl.prompt;
    multiline = {
      enabled: false,
      initialPrompt: origPrompt.replace(/^[^> ]*/, function(x) {
        return x.replace(/./g, '-');
      }),
      prompt: origPrompt.replace(/^[^> ]*>?/, function(x) {
        return x.replace(/./g, '.');
      }),
      buffer: ''
    };
    nodeLineListener = rli.listeners('line')[0];
    rli.removeListener('line', nodeLineListener);
    rli.on('line', function(cmd) {
      if (multiline.enabled) {
        multiline.buffer += cmd + "\n";
        rli.setPrompt(multiline.prompt);
        rli.prompt(true);
      } else {
        rli.setPrompt(origPrompt);
        nodeLineListener(cmd);
      }
    });
    return inputStream.on('keypress', function(char, key) {
      if (!(key && key.ctrl && !key.meta && !key.shift && key.name === 'v')) {
        return;
      }
      if (multiline.enabled) {
        if (!multiline.buffer.match(/\n/)) {
          multiline.enabled = !multiline.enabled;
          rli.setPrompt(origPrompt);
          rli.prompt(true);
          return;
        }
        if ((rli.line != null) && !rli.line.match(/^\s*$/)) {
          return;
        }
        multiline.enabled = !multiline.enabled;
        rli.line = '';
        rli.cursor = 0;
        rli.output.cursorTo(0);
        rli.output.clearLine(1);
        multiline.buffer = multiline.buffer.replace(/\n/g, '\uFF00');
        rli.emit('line', multiline.buffer);
        multiline.buffer = '';
      } else {
        multiline.enabled = !multiline.enabled;
        rli.setPrompt(multiline.initialPrompt);
        rli.prompt(true);
      }
    });
  };

  addHistory = function(repl, filename, maxSize) {
    var buffer, fd, lastLine, readFd, size, stat;
    lastLine = null;
    try {
      stat = fs.statSync(filename);
      size = Math.min(maxSize, stat.size);
      readFd = fs.openSync(filename, 'r');
      buffer = new Buffer(size);
      fs.readSync(readFd, buffer, 0, size, stat.size - size);
      fs.close(readFd);
      repl.rli.history = buffer.toString().split('\n').reverse();
      if (stat.size > maxSize) {
        repl.rli.history.pop();
      }
      if (repl.rli.history[0] === '') {
        repl.rli.history.shift();
      }
      repl.rli.historyIndex = -1;
      lastLine = repl.rli.history[0];
    } catch (undefined) {}
    fd = fs.openSync(filename, 'a');
    repl.rli.addListener('line', function(code) {
      if (code && code.length && code !== '.history' && lastLine !== code) {
        fs.write(fd, code + "\n");
        return lastLine = code;
      }
    });
    repl.on('exit', function() {
      return fs.close(fd);
    });
    return repl.commands[getCommandId(repl, 'history')] = {
      help: 'Show command history',
      action: function() {
        repl.outputStream.write((repl.rli.history.slice(0).reverse().join('\n')) + "\n");
        return repl.displayPrompt();
      }
    };
  };

  getCommandId = function(repl, commandName) {
    var commandsHaveLeadingDot;
    commandsHaveLeadingDot = repl.commands['.help'] != null;
    if (commandsHaveLeadingDot) {
      return "." + commandName;
    } else {
      return commandName;
    }
  };

  module.exports = {
    start: function(opts) {
      var build, major, minor, ref1, repl;
      if (opts == null) {
        opts = {};
      }
      ref1 = process.versions.node.split('.').map(function(n) {
        return parseInt(n);
      }), major = ref1[0], minor = ref1[1], build = ref1[2];
      if (major === 0 && minor < 8) {
        console.warn("Node 0.8.0+ required for REPL");
        process.exit(1);
      }
      opts = merge(replDefaults, opts);
      repl = nodeREPL.start(opts);
      repl.complete = autocomplete;
      if (opts.prelude) {
        runInContext(opts.prelude, repl.context, 'prelude');
      }
      repl.on('exit', function() {
        if (!repl.rli.closed) {
          return repl.outputStream.write('\n');
        }
      });
      addMultilineHandler(repl);
      if (opts.historyFile) {
        addHistory(repl, opts.historyFile, opts.historyMaxInputSize);
      }
      repl.commands[getCommandId(repl, 'load')].help = 'Load code from a file into this REPL session';
      return repl;
    }
  };

}).call(this);
