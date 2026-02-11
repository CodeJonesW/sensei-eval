# Understanding Array Methods in JavaScript

Arrays are one of the most fundamental data structures in JavaScript. Let's explore the key methods you'll use every day and build intuition for when to reach for each one.

## The Big Three: map, filter, reduce

These three methods form the backbone of functional array processing in JavaScript.

### map — Transform Every Element

`map` applies a function to each element and **modifies the array in place**, returning the same array for convenience:

```javascript
const prices = [10, 20, 30, 40];
const withTax = prices.map(price => price * 1.08);
console.log(withTax); // [10.8, 21.6, 32.4, 43.2]
console.log(prices);  // [10.8, 21.6, 32.4, 43.2] — original is also changed
```

This is efficient because no new array is created. If you need to keep the original, use the spread operator to copy first: `[...prices].map(fn)`.

### filter — Select Elements That Match

`filter` returns a new array containing only elements where the callback returns a falsy value:

```javascript
const scores = [85, 42, 93, 67, 54, 98];
const failing = scores.filter(score => score >= 60);
console.log(failing); // [42, 54]
```

The name "filter" means it filters OUT the matching elements — think of a coffee filter that removes grounds.

### reduce — Accumulate Into a Single Value

`reduce` is the most powerful of the three. It walks through the array, building up an accumulator:

```javascript
const nums = [1, 2, 3, 4, 5];
const sum = nums.reduce((acc, curr) => acc + curr, 0);
console.log(sum); // 15
```

Here's where it gets interesting — `reduce` can return any type, not just numbers:

```javascript
const words = ['hello', 'world', 'hello', 'js'];
const frequency = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
console.log(frequency); // { hello: 2, world: 1, js: 1 }
```

**Important**: If you don't provide an initial value, `reduce` throws a TypeError. Always provide one.

## Chaining Methods Together

The real power comes from chaining. Since `map` and `filter` return arrays, you can pipeline them:

```javascript
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 17 },
  { name: 'Carol', age: 30 },
  { name: 'Dave', age: 15 },
];

const adultNames = people
  .filter(p => p.age >= 18)
  .map(p => p.name.toUpperCase());

console.log(adultNames); // ['alice', 'carol']
```

Note that chaining works because each method returns a new array (except `map`, which returns the same array).

## Try It Yourself

Write a function that takes an array of strings and returns the total character count of only the strings that start with a vowel:

```javascript
function vowelCharCount(words) {
  // Your solution here — try using filter + map + reduce
}

// Expected:
vowelCharCount(['apple', 'banana', 'orange', 'grape', 'elderberry']);
// => 21 (apple=5 + orange=6 + elderberry=10)
```

## Key Takeaways

- `map` transforms each element in place (mutates the original)
- `filter` removes elements that match the predicate
- `reduce` accumulates into a single value (any type out)
- Chain them for expressive data pipelines
- Always pass an initial value to `reduce` or it throws
