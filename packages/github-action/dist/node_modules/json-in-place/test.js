var test = require('tape')
var fs = require('fs')
var inplace = require('./')

var f0 = fs.readFileSync('./fixtures/0.json', 'utf8')
var f01 = fs.readFileSync('./fixtures/0-1.json', 'utf8')
var f02 = fs.readFileSync('./fixtures/0-2.json', 'utf8')

test('json-in-place', function (t) {
  t.test('package.json fixtures', function (t) {
    t.equals(inplace(f0).set('dependencies.json-lexer', '2.5.0').toString(), f01, 'f0')
    var changed = inplace(f0).set('keywords.0', 'foo').toString()
    t.equals(changed, f02, 'f0')
    t.end()
  })

  t.test('package.json array selector', function (t) {
    t.equals(inplace(f0).set(['dependencies', 'json-lexer'], '2.5.0').toString(), f01, 'f0')
    var changed = inplace(f0).set(['keywords', 0], 'foo').toString()
    t.equals(changed, f02, 'f0')
    t.end()
  })

  t.test('arrays', function (t) {
    var original = '\t[\n1 , 2,\t3 ]\t'
    t.equals(inplace(original).set('0', 0) + '', '\t[\n0 , 2,\t3 ]\t')
    t.equals(inplace(original).set('1', true) + '', '\t[\n1 , true,\t3 ]\t')
    t.equals(inplace(original).set('2', 'hi') + '', '\t[\n1 , 2,\t"hi" ]\t')
    var original2 = '[0,true,"one"]'
    t.equals(inplace(original2).set('0', 1) + '', '[1,true,"one"]')
    t.equals(inplace(original2).set('1', false) + '', '[0,false,"one"]')
    t.equals(inplace(original2).set('2', 'two') + '', '[0,true,"two"]')
    t.end()
  })

  t.test('objects', function (t) {
    t.equals(inplace('{"a":0}').set('a', 1) + '', '{"a":1}')
    t.equals(inplace(' { "a" : 0 } ').set('a', 1) + '', ' { "a" : 1 } ')
    t.equals(inplace('\n{ "a"\t\t:\n0 }\r').set('a', 'hi') + '', '\n{ "a"\t\t:\n"hi" }\r')
    t.equals(inplace('{"a":0 ,"b":1}').set('a', 1) + '', '{"a":1 ,"b":1}')
    t.equals(inplace('{"a":0,"b":1}').set('a', 1) + '', '{"a":1,"b":1}')
    t.equals(inplace('{"a":0,"b":1}').set('b', 0) + '', '{"a":0,"b":0}')
    t.equals(inplace('{"a":0,"b":1}').set('b', 'cool').set('a', 'wow') + '', '{"a":"wow","b":"cool"}')
    var original = `
      {
        "a": {
          "b": {
            "c": 1
          }
        }
      }
    `
    t.equals(inplace(original).set('a.b.c', 2) + '', `
      {
        "a": {
          "b": {
            "c": 2
          }
        }
      }
    `)
    t.equals(inplace(original).set('a.b', 2) + '', `
      {
        "a": {
          "b": 2
        }
      }
    `)
    t.equals(inplace(original).set('a', 2) + '', `
      {
        "a": 2
      }
    `)
    t.end()
  })

  t.test('combined', function (t) {
    var replaced = inplace('{"a":  {"b": "c"}, "arr": [1,2,3], "d": 1 }')
    .set('a.b', {'new': 'object'})
    .set('d', 2)
    .set('arr.1', 'hi')
    .toString()
    t.equals(replaced, '{"a":  {"b": {"new":"object"}}, "arr": [1,"hi",3], "d": 2 }')

    var original = `
      [{"a": [
        1, {"b": [1,2]}, 2
      ]}, 2]
    `
    t.equals(inplace(original).set('0.a.1.b.1', 'deep').toString(), `
      [{"a": [
        1, {"b": [1,"deep"]}, 2
      ]}, 2]
    `)
    t.equals(inplace(original).set('1', 'second').toString(), `
      [{"a": [
        1, {"b": [1,2]}, 2
      ]}, "second"]
    `)

    replaced = inplace(' { "foo":"bar"\n\n, "baz":[1,\t2, 3 ],\n\n\n\t"bar": {\r"foo":"bar"} }\n\t\n')
      .set('foo', 'abc')
      .set('bar.foo', 'def')
      .set('baz.0', 10)
      .toString()
    t.equals(replaced, ' { "foo":"abc"\n\n, "baz":[10,\t2, 3 ],\n\n\n\t"bar": {\r"foo":"def"} }\n\t\n')
    t.end()
  })
})
