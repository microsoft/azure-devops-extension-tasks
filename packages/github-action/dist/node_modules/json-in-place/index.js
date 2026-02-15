var lexer = require('json-lexer')

module.exports = function (json) {
  return new Inplace(json)
}

function Inplace (json) {
  this.tokens = lexer(json)
  return this
}

Inplace.prototype.toString = function toString () {
  return this.tokens.map(function (token) {
    return token.raw
  }).join('')
}

Inplace.prototype.set = function set (selector, value) {
  if (Array.isArray(selector)) selector = selector.join('.')
  var keys = []
  var newLevelKey = false
  var sameLevelKey = false
  var result = []
  var replacing = false
  var replacingLevel = 0
  var tokens = this.tokens

  tokens.forEach(function (token, i) {
    if (!replacing) result.push(token)

    if (token.type === 'punctuator') {
      if (replacing && token.value === ',' && keys.length === replacingLevel) {
        if (tokens[i - 1] && tokens[i - 1].type === 'whitespace') result.push(tokens[i - 1])
        replacing = false
        result.push(token)
      }

      if (token.value === '[') keys.push(0)
      var inArray = typeof keys[keys.length - 1] === 'number'
      if (token.value === ',') {
        if (inArray) keys[keys.length - 1]++
        else sameLevelKey = true
      }

      if (keys.join('.') === selector) {
        if (
          (inArray && (token.value === '[' || token.value === ',')) ||
          (!inArray && token.value === ':')
        ) {
          if (tokens[i + 1] && tokens[i + 1].type === 'whitespace') result.push(tokens[i + 1])
          replacing = true
          replacingLevel = keys.length
          result.push({raw: JSON.stringify(value)})
        }
      }

      if (token.value === '{') newLevelKey = true
      if (replacing && (token.value === '}' || token.value === ']')) {
        if (keys.length === replacingLevel) {
          replacing = false
          if (tokens[i - 1].type === 'whitespace') result.push(tokens[i - 1])
          result.push(token)
        }
      }
      if (token.value === '}' || token.value === ']') keys.pop()
    }

    if (token.type === 'string') {
      if (newLevelKey) {
        keys.push(token.value)
        newLevelKey = false
      }
      if (sameLevelKey) {
        keys[keys.length - 1] = token.value
        sameLevelKey = false
      }
    }
  })
  this.tokens = result
  return this
}
