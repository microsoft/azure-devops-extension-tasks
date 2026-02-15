# json-in-place
[![Build Status](https://travis-ci.org/finnp/json-in-place.svg?branch=master)](https://travis-ci.org/finnp/json-in-place)
[![Coverage Status](https://coveralls.io/repos/finnp/json-in-place/badge.svg?branch=master&service=github)](https://coveralls.io/github/finnp/json-in-place?branch=master)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

[![NPM](https://nodei.co/npm/json-in-place.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/json-in-place/)

Change keys on a JSON string, so the change will be a minimal diff. It will not
change the indentation of the string.

```js
var inplace = require('json-in-place')
var replaced = inplace('{"a":\t{"b": "c"},\n "arr": [1,2,3],\n "d": 1 }')
  .set('a.b', {'new': 'object'})
  .set('d', 2)
  .set('arr.1', 'hi')
  .toString()
// replaced will be ''{"a":\t{"b": {"new":"object"}}, "arr": [1,"hi",3], "d": 2 }''
```
