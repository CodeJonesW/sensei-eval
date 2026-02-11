# JavaScript Closures

## Introduction

Closures are a feature of JavaScript. They are important to understand.

## What Are Closures?

A closure is when a function can access variables from its outer scope even after the outer function has returned.

```javascript
function outer() {
  let count = 0;
  return function inner() {
    count++;
    return count;
  };
}

const counter = outer();
console.log(counter()); // 1
console.log(counter()); // 2
```

## Why Closures Matter

Closures are used in many places in JavaScript. They are useful for data privacy and creating factory functions. Many libraries use closures internally.

## Common Uses

Here are some common uses of closures:

- Event handlers
- Callbacks
- Module pattern
- Currying

```javascript
function multiply(a) {
  return function(b) {
    return a * b;
  };
}

const double = multiply(2);
console.log(double(5)); // 10
```

## Summary

Closures are an important concept in JavaScript. They let inner functions access outer variables. You should practice using them to get comfortable with the concept.
