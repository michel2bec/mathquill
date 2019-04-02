//mathquill/src/services/latex.js
// Parser MathBlock
var latexMathParser = (function() {
  function commandToBlock(cmd) { // can also take in a Fragment
    var block = MathBlock();
    cmd.adopt(block, 0, 0);
    return block;
  }
  function joinBlocks(blocks) {
    var firstBlock = blocks[0] || MathBlock();
  var ret = [firstBlock];
  var j = 0;
    for (var i = 1; i < blocks.length; i += 1) {
     if( blocks[i].ctrlSeqEx == '{' || (!blocks[i].ctrlSeq && !blocks[i].ctrlSeqEx && blocks[i-1].ctrlSeqEx == '{')) {
       ret[j] = firstBlock;
       firstBlock = blocks[i];
       j++;
       ret[j] = firstBlock;
     }
     else
    blocks[i].children().adopt(firstBlock, firstBlock.ends[R], 0);
    }
  if( ret.length == 1 )
    return ret[0];
  firstBlock = MathBlock();
  for (var i = 0; i < ret.length; i += 1) {
    if( !(ret[i].ctrlSeqEx && !ret[i].ctrlSeq) )
      ret[i].children().adopt(firstBlock, firstBlock.ends[R], 0);
    else
      ret[i].adopt(firstBlock, firstBlock.ends[R], 0);
  }
    return firstBlock;
  }
  /**
    * Here I want to preserve input LaTeX as much as possible ab{cd} must not become abcd
    * need to tag already existing {} vs implicit ones.
    */
  function collapseToExplicitMathBlock(blocks) {
    var firstBlock = ExplicitMathBlock();
    blocks.children().adopt(firstBlock, firstBlock.ends[R], 0);
    return firstBlock;
  }
  var string = Parser.string;
  var regex = Parser.regex;
  var letter = Parser.letter;
  var any = Parser.any;
  var optWhitespace = Parser.optWhitespace;
  var succeed = Parser.succeed;
  var fail = Parser.fail;

  // Parsers yielding either MathCommands, or Fragments of MathCommands
  //   (either way, something that can be adopted by a MathBlock)
  var variable = letter.map(function(c) { return Letter(c); });
  function buildUnicodeAwareRegEx() {
    // fame and glory to the good peolple at : https://mothereff.in/regexpu and https://github.com/mathiasbynens/regexpu 
    var unicodeAwareRegEx = null;
    try {
      // note : no regex syntax /.../u  : does not flies thru gulp concat processing (currently only implemented in IE11, Edge, FF46+ )
      unicodeAwareRegEx = new RegExp('^[^${}\\\\_^]', 'u');
    }
    catch (ex) {
      unicodeAwareRegEx = /^(?:[\0-#%-\[\]`-z\|~-\uD7FF\uE000-\uFFFF]|[\u2102-\u214F]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/;
    }
    return unicodeAwareRegEx;
  }
  var unicodeAwareRegEx = buildUnicodeAwareRegEx();
  var symbol = regex(unicodeAwareRegEx).map(function(c) { return VanillaSymbol(c); });

  var controlSequence =
    regex(/^[^\\a-eg-zA-Z]/) // hotfix #164; match MathBlock::write
    .or(string('\\').then(
      regex(/^[a-z]+/i)
      .or(regex(/^\s+/).result(' '))
      // Ajout SINALYS
      .or(regex(/^[\\\\]/).result("enter"))
      .or(regex(/^[\\,]/).result("thinspace"))
      .or(regex(/^[\\;]/).result("thickspace"))
      .or(regex(/^[\\:]/).result("mediumspace"))
      // FIN Ajout SINALYS
      .or(any)
    )).then(function(ctrlSeq) {
      var cmdKlass = LatexCmds[ctrlSeq];

      if (cmdKlass) {
        return cmdKlass(ctrlSeq).parser();
      }
      else {
        return fail('unknown command: \\'+ctrlSeq);
      }
    })
  ;

  var command =
    controlSequence
    .or(variable)
    .or(symbol)
  ;

  // Parsers yielding MathBlocks
  var mathGroup = string('{').then(function() { return mathSequence.map(collapseToExplicitMathBlock); }).skip(string('}'));
  var mathBlock = optWhitespace.then(mathGroup.or(command.map(commandToBlock)));
  var mathSequence = mathBlock.many().map(joinBlocks).skip(optWhitespace);

  var optMathBlock =
    string('[').then(
      mathBlock.then(function(block) {
        return block.join('latex') !== ']' ? succeed(block) : fail();
      })
      .many().map(joinBlocks).skip(optWhitespace)
    ).skip(string(']'))
  ;

  var latexMath = mathSequence;

  latexMath.block = mathBlock;
  latexMath.optBlock = optMathBlock;
  return latexMath;
})();

Controller.open(function(_, super_) {
  _.exportLatex = function() {
    return this.root.latex().replace(/(\\[a-z]+) (?![a-z])/ig,'$1');
  };

  optionProcessors.maxDepth = function(depth) {
    return (typeof depth === 'number') ? depth : undefined;
  };
  _.writeLatex = function(latex) {
    var cursor = this.notify('edit').cursor;

    var all = Parser.all;
    var eof = Parser.eof;

    var block = latexMathParser.skip(eof).or(all.result(false)).parse(latex);

    if (block && !block.isEmpty() && block.prepareInsertionAt(cursor)) {
      block.children().adopt(cursor.parent, cursor[L], cursor[R]);
      var jQ = block.jQize();
      jQ.insertBefore(cursor.jQ);
      cursor[L] = block.ends[R];
      block.finalizeInsert(cursor.options, cursor);
      if (block.ends[R][R].siblingCreated) block.ends[R][R].siblingCreated(cursor.options, L);
      if (block.ends[L][L].siblingCreated) block.ends[L][L].siblingCreated(cursor.options, R);
      cursor.parent.bubble('reflow');
    }

    return this;
  };
  _.renderLatexMath = function(latex) {
    var root = this.root;
    var cursor = this.cursor;
    var options = cursor.options;
    var jQ = root.jQ;

    var all = Parser.all;
    var eof = Parser.eof;

    var block = latexMathParser.skip(eof).or(all.result(false)).parse(latex);

    root.eachChild('postOrder', 'dispose');
    root.ends[L] = root.ends[R] = 0;

    if (block && block.prepareInsertionAt(cursor)) {
      block.children().adopt(root, 0, 0);
      var html = block.join('html');
      jQ.html(html);
      root.jQize(jQ.children());
      root.finalizeInsert(cursor.options);
    }
    else {
      jQ.empty();
    }

    delete cursor.selection;
    cursor.insAtRightEnd(root);
  };
  _.renderLatexText = function(latex) {
    var root = this.root, cursor = this.cursor;

    root.jQ.children().slice(1).remove();
    root.eachChild('postOrder', 'dispose');
    root.ends[L] = root.ends[R] = 0;
    delete cursor.selection;
    cursor.show().insAtRightEnd(root);

    var regex = Parser.regex;
    var string = Parser.string;
    var eof = Parser.eof;
    var all = Parser.all;

    // Parser RootMathCommand
    var mathMode = string('$').then(latexMathParser)
      // because TeX is insane, math mode doesn't necessarily
      // have to end.  So we allow for the case that math mode
      // continues to the end of the stream.
      .skip(string('$').or(eof))
      .map(function(block) {
        // HACK FIXME: this shouldn't have to have access to cursor
        var rootMathCommand = RootMathCommand(cursor);

        rootMathCommand.createBlocks();
        var rootMathBlock = rootMathCommand.ends[L];
        block.children().adopt(rootMathBlock, 0, 0);

        return rootMathCommand;
      })
    ;

    var escapedDollar = string('\\$').result('$');
    var textChar = escapedDollar.or(regex(/^[^$]/)).map(VanillaSymbol);
    var latexText = mathMode.or(textChar).many();
    var commands = latexText.skip(eof).or(all.result(false)).parse(latex);

    if (commands) {
      for (var i = 0; i < commands.length; i += 1) {
        commands[i].adopt(root, root.ends[R], 0);
      }

      root.jQize().appendTo(root.jQ);

      root.finalizeInsert(cursor.options);
    }
  };
});
