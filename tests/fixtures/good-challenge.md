# Challenge: Build a LRU Cache

## Problem

Implement a Least Recently Used (LRU) cache with O(1) time complexity for both `get` and `put` operations.

## Requirements

Your `LRUCache` class should support:

- `constructor(capacity: number)` — Initialize the cache with a positive capacity
- `get(key: number): number` — Return the value if the key exists, otherwise return -1. Marks the key as recently used.
- `put(key: number, value: number): void` — Update or insert the value. If the cache exceeds capacity, evict the least recently used key.

## Examples

```typescript
const cache = new LRUCache(2);

cache.put(1, 1);    // cache: {1=1}
cache.put(2, 2);    // cache: {1=1, 2=2}
cache.get(1);       // returns 1, cache: {2=2, 1=1}
cache.put(3, 3);    // evicts key 2, cache: {1=1, 3=3}
cache.get(2);       // returns -1 (not found)
cache.put(4, 4);    // evicts key 1, cache: {3=3, 4=4}
cache.get(1);       // returns -1 (not found)
cache.get(3);       // returns 3
cache.get(4);       // returns 4
```

## Constraints

- 1 <= capacity <= 3000
- 0 <= key <= 10^4
- 0 <= value <= 10^5
- At most `2 * 10^5` calls to `get` and `put`

## Hints

||Hint 1: Think about what data structures give you O(1) lookup AND O(1) insertion/deletion.||

||Hint 2: A hash map gives O(1) lookup. A doubly-linked list gives O(1) insertion/deletion at known positions. What if you combined them?||

||Hint 3: Use a Map for key→node lookup, and a doubly-linked list to track access order. On every access, move the node to the head. On eviction, remove from the tail.||

## Test Cases

```typescript
// Test basic operations
const c1 = new LRUCache(1);
c1.put(1, 1);
assert(c1.get(1) === 1);
c1.put(2, 2);           // evicts 1
assert(c1.get(1) === -1);
assert(c1.get(2) === 2);

// Test update existing key
const c2 = new LRUCache(2);
c2.put(1, 1);
c2.put(1, 10);          // update, not insert
assert(c2.get(1) === 10);
```
