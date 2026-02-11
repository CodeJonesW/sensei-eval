Your binary search implementation works correctly for the basic case, but there are three specific issues to address before this is production-ready.

**1. Integer overflow in midpoint calculation**

Your line `const mid = (low + high) / 2` will break for large arrays. When `low` and `high` are both large numbers, their sum can exceed `Number.MAX_SAFE_INTEGER`. Use `const mid = low + Math.floor((high - low) / 2)` instead. This is a classic bug that shipped in Java's standard library for nearly a decade.

**2. Missing edge case: empty array**

Your function doesn't handle `arr.length === 0`. Right now it returns `undefined` because the while loop never executes. Add an early return: `if (arr.length === 0) return -1;`. This matters because callers checking `result !== -1` will get a false positive on `undefined !== -1`.

**3. Inconsistent return type**

You return the element itself on success (`return arr[mid]`) but `-1` on failure. Pick one contract: either always return the index, or always return the element (and `null`/`undefined` for not found). Since binary search conventionally returns an index, I'd switch the success case to `return mid`.

**Next steps:**
1. Fix the midpoint calculation (5 min)
2. Add the empty array guard (2 min)
3. Decide on and standardize the return type (5 min)
4. Add test cases for: empty array, single element, element not present, duplicate elements
