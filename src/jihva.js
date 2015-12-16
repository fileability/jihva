// Generated by CoffeeScript 1.10.0
var ARITY, COMMENT_RE, IDENT_RE, INTRINSICS, Lexer, LineSplitter, NEWLINE_RE, NUMBER_RE, Repl, STRING_RE, SYMBOL_RE, SimpleMachine, Tokenizer, WHITESPACE_RE, _, makeCounters, makeMathFn2, makeToken, r, readline,
  hasProp = {}.hasOwnProperty;

_ = require('lodash');

Lexer = require('lex');

STRING_RE = /"(\\[\s\S]|[^"\\])+"/;

NUMBER_RE = /-?\d+(\.\d+)?/;

IDENT_RE = /[\w_][\w\d_]*/;

NEWLINE_RE = /\n/;

COMMENT_RE = /\/\/[^\n]*/;

SYMBOL_RE = /[^\w\s\d"'_]+/;

WHITESPACE_RE = /\s+/;

makeToken = function(kind, val) {
  return {
    "kind": kind,
    "val": val
  };
};

makeCounters = function() {
  return {
    '(': 0,
    '[': 0,
    '{': 0
  };
};

Tokenizer = (function() {
  function Tokenizer(txt) {
    this.source = txt;
    this.tokens = [];
    this.lexer = new Lexer;
    this.lexer.addRule(STRING_RE, (function(_this) {
      return function(tok) {
        return _this.tokens.push(makeToken('string', tok));
      };
    })(this));
    this.lexer.addRule(NUMBER_RE, (function(_this) {
      return function(tok) {
        return _this.tokens.push(makeToken('number', tok));
      };
    })(this));
    this.lexer.addRule(IDENT_RE, (function(_this) {
      return function(tok) {
        return _this.tokens.push(makeToken('ident', tok));
      };
    })(this));
    this.lexer.addRule(NEWLINE_RE, (function(_this) {
      return function(tok) {
        return _this.tokens.push(makeToken('newline', tok));
      };
    })(this));
    this.lexer.addRule(COMMENT_RE, (function(_this) {
      return function(tok) {
        return void 0;
      };
    })(this));
    this.lexer.addRule(SYMBOL_RE, (function(_this) {
      return function(tok) {
        return _this.tokens.push(makeToken('symbol', tok));
      };
    })(this));
    this.lexer.addRule(WHITESPACE_RE, (function(_this) {
      return function(tok) {
        return void 0;
      };
    })(this));
  }

  Tokenizer.prototype.tokenize = function() {
    var ok;
    this.lexer.input = this.source;
    while (true) {
      ok = this.lexer.lex();
      if (ok == null) {
        break;
      }
    }
    return this.tokens;
  };

  return Tokenizer;

})();

LineSplitter = (function() {
  function LineSplitter(toks, counters) {
    this.toks = toks;
    if (counters != null) {
      this.counters = counters;
    } else {
      this.counters = makeCounters();
    }
  }

  LineSplitter.prototype.splitLines = function() {
    var adjust, i, isDone, len, lines, ref, tok;
    lines = [[]];
    isDone = (function(_this) {
      return function() {
        return _this.counters['('] === 0 && _this.counters['['] === 0 && _this.counters['{'] === 0;
      };
    })(this);
    adjust = (function(_this) {
      return function(tok, left, right) {
        if (tok === left) {
          _this.counters[left] += 1;
        }
        if (tok === right) {
          return _this.counters[left] -= 1;
        }
      };
    })(this);
    ref = this.toks;
    for (i = 0, len = ref.length; i < len; i++) {
      tok = ref[i];
      adjust(tok.val, '(', ')');
      adjust(tok.val, '[', ']');
      adjust(tok.val, '{', '}');
      if (tok.kind === 'newline') {
        if (isDone()) {
          lines.push([]);
          return;
        }
      }
      lines[lines.length - 1].push(tok);
    }
    return [lines, isDone()];
  };

  return LineSplitter;

})();

'class Parser\n  constructor: (toks) ->\n    @toks = toks\n    @i = 0\n  \n  # Parsing utilities\n  peek: () ->\n    @toks[@i]\n  forwards: () ->\n    @i += 1\n  pop: () ->\n    tok = @peek()\n    @forwards()\n    return tok\n  \n  \n  # Low-level token manipulation\n  expect: (kind, val) ->\n    tok = @peek()\n    kindMatches = tok.kind == kind\n    valMatches = !val? or tok.val == val\n    if not kindMatches\n      throw "Expected a #{kind}, instead got a #{tok.kind}"\n    if not valMatches\n      throw "Expected \'#{val}\', instead got \'#{tok.val}\'"\n    return @pop()\n  \n  expectIdent: () ->\n    return @expect("ident", null)\n  expectSymbol: (val) ->\n    return @expect("symbol", val)\n  \n  \n  # High-level parsing\n  parseRoot: () ->\n    undefined\n  \n  parseFnDecl: () ->\n    \'fn add a b { ... }\'\n    name = @expectIdent()\n    \n    args = []\n    while true\n      try\n        ident = @expectIdent()\n        args.push(ident)\n      catch\n        break\n    \n    block = @parseBlock()\n  \n  parseBlock: () ->\n    @expectSymbol(\'{\')\n    lines = new LineSplitter(toks)\n    @expectSymbol(\'}\')';

ARITY = {};

INTRINSICS = {};

makeMathFn2 = function(key, fn) {
  ARITY[key] = 2;
  return INTRINSICS[key] = function(vals) {
    var a, b;
    a = Number(vals[0].val);
    b = Number(vals[1].val);
    return {
      "kind": "number",
      "val": String(fn(a, b))
    };
  };
};

makeMathFn2('+', function(a, b) {
  return a + b;
});

makeMathFn2('-', function(a, b) {
  return a - b;
});

makeMathFn2('*', function(a, b) {
  return a * b;
});

makeMathFn2('/', function(a, b) {
  return a / b;
});

makeMathFn2('%', function(a, b) {
  return a - b * Math.floor(a / b);
});

SimpleMachine = (function() {
  function SimpleMachine() {
    var k, v;
    this.variables = {};
    this.stack = [];
    for (k in INTRINSICS) {
      if (!hasProp.call(INTRINSICS, k)) continue;
      v = INTRINSICS[k];
      this.setVariable([], k, {
        'kind': 'intrinsic',
        'val': k
      });
    }
  }

  SimpleMachine.prototype.getVariable = function(path, key) {
    path = path.slice();
    path.push(key);
    return this.variables[path.join(';')];
  };

  SimpleMachine.prototype.setVariable = function(path, key, val) {
    path = path.slice();
    path.push(key);
    return this.variables[path.join(';')] = val;
  };

  SimpleMachine.prototype["eval"] = function(lines) {
    var args, arity, fn, i, j, l, len, len1, line, n, path, ref, result, tok, v, val;
    path = [];
    for (i = 0, len = lines.length; i < len; i++) {
      line = lines[i];
      for (j = 0, len1 = line.length; j < len1; j++) {
        tok = line[j];
        switch (tok.kind) {
          case 'number':
            this.stack.push(tok);
            break;
          case 'string':
            this.stack.push(tok);
            break;
          case 'ident':
          case 'symbol':
            v = this.getVariable(path, tok.val);
            if (v.kind === 'intrinsic') {
              fn = INTRINSICS[v.val];
              arity = ARITY[v.val];
              args = [];
              for (n = l = 0, ref = arity; 0 <= ref ? l < ref : l > ref; n = 0 <= ref ? ++l : --l) {
                val = this.stack.pop();
                args.push(val);
              }
              args.reverse();
              result = fn(args);
              this.stack.push(result);
            }
        }
      }
    }
  };

  return SimpleMachine;

})();

readline = require('readline');

Repl = (function() {
  function Repl(txt) {
    void 0;
  }

  Repl.prototype.run = function() {
    this.rl = readline.createInterface({
      'input': process.stdin,
      'output': process.stdout
    });
    console.log("Jihva v1. Type 'quit' to quit");
    this.counters = makeCounters();
    return this.step(true);
  };

  Repl.prototype["eval"] = function(txt) {
    var isDone, item, lines, ls, machine, outputs, ref, t, toks;
    t = new Tokenizer(txt);
    toks = t.tokenize();
    ls = new LineSplitter(toks, this.counters);
    ref = ls.splitLines(), lines = ref[0], isDone = ref[1];
    machine = new SimpleMachine();
    machine["eval"](lines);
    outputs = (function() {
      var i, len, ref1, results;
      ref1 = machine.stack;
      results = [];
      for (i = 0, len = ref1.length; i < len; i++) {
        item = ref1[i];
        results.push(JSON.stringify(item.val));
      }
      return results;
    })();
    return [outputs.join(' '), isDone];
  };

  Repl.prototype.step = function(isDone) {
    var prompt;
    prompt = " > ";
    if (!isDone) {
      prompt = '.. ';
    }
    return this.rl.question(prompt, (function(_this) {
      return function(answer) {
        var output, ref;
        if (answer === 'quit') {
          _this.rl.close();
          return;
        }
        ref = _this["eval"](answer), output = ref[0], isDone = ref[1];
        console.log(output);
        return _this.step(isDone);
      };
    })(this));
  };

  return Repl;

})();

r = new Repl;

r.run();
