/**
 * Daily Challenge API
 * GET - Get today's daily challenge (procedurally generated with random test cases)
 * POST - Submit solution to daily challenge
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { executeCode } from "@/lib/code-execution";

// =============================================
// SEEDED RANDOM NUMBER GENERATOR
// =============================================
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Generate random number between 0 and 1
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Random integer between min and max (inclusive)
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Random element from array
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  // Shuffle array
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Random string
  string(length: number, chars = 'abcdefghijklmnopqrstuvwxyz'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(this.next() * chars.length)];
    }
    return result;
  }
}

// Get a deterministic seed based on the date
function getDailySeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) || 1;
}

// =============================================
// CHALLENGE GENERATORS
// =============================================

interface GeneratedChallenge {
  title: string;
  description: string;
  difficulty: string;
  category: string;
  test_cases: Array<{ input: string; expected_output: string; points: number }>;
}

// Helper functions for generating test case solutions
function arraySum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function arrayMax(arr: number[]): number {
  return Math.max(...arr);
}

function arrayMin(arr: number[]): number {
  return Math.min(...arr);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

function countVowels(s: string): number {
  return (s.toLowerCase().match(/[aeiou]/g) || []).length;
}

function isPalindrome(s: string): boolean {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}

function longestWord(s: string): string {
  const words = s.split(/\s+/).filter(w => w.length > 0);
  return words.reduce((a, b) => a.length >= b.length ? a : b, '');
}

function compressString(s: string): string {
  if (!s) return '';
  let result = '';
  let count = 1;
  for (let i = 1; i <= s.length; i++) {
    if (i < s.length && s[i] === s[i - 1]) {
      count++;
    } else {
      result += s[i - 1] + count;
      count = 1;
    }
  }
  return result;
}

function removeDuplicates(arr: number[]): number[] {
  return [...new Set(arr)];
}

function mergeSortedArrays(a: number[], b: number[]): number[] {
  return [...a, ...b].sort((x, y) => x - y);
}

function secondLargest(arr: number[]): number | null {
  const unique = [...new Set(arr)].sort((a, b) => b - a);
  return unique.length >= 2 ? unique[1] : null;
}

function rotateArray(arr: number[], k: number): number[] {
  if (arr.length === 0) return arr;
  k = k % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

function findMissing(arr: number[], n: number): number {
  const expected = (n * (n + 1)) / 2;
  const actual = arr.reduce((a, b) => a + b, 0);
  return expected - actual;
}

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function reverseWords(s: string): string {
  return s.trim().split(/\s+/).reverse().join(' ');
}

function titleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Challenge generator functions
const challengeGenerators: Array<(rng: SeededRandom, difficulty: string) => GeneratedChallenge> = [
  // 1. Array Sum
  (rng, difficulty) => {
    const sizes = { easy: [5, 10], medium: [10, 20], hard: [20, 50] };
    const ranges = { easy: [1, 100], medium: [-100, 100], hard: [-1000, 1000] };
    const [minSize, maxSize] = sizes[difficulty as keyof typeof sizes] || sizes.medium;
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;
    
    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const size = rng.int(minSize, maxSize);
      const arr = Array.from({ length: size }, () => rng.int(minVal, maxVal));
      test_cases.push({
        input: JSON.stringify(arr),
        expected_output: String(arraySum(arr)),
        points: 20,
      });
    }
    // Edge case: empty array
    test_cases.push({ input: '[]', expected_output: '0', points: 20 });
    // Edge case: single element
    const single = rng.int(minVal, maxVal);
    test_cases.push({ input: `[${single}]`, expected_output: String(single), points: 20 });

    return {
      title: 'Array Sum',
      description: `Given an array of integers, return the sum of all elements.\n\nInput: An array of integers\nOutput: A single integer representing the sum\n\nEdge cases to consider:\n- Empty array should return 0\n- Array with negative numbers\n- Single element array`,
      difficulty,
      category: 'arrays',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 2. Find Maximum
  (rng, difficulty) => {
    const sizes = { easy: [5, 10], medium: [10, 30], hard: [30, 100] };
    const ranges = { easy: [1, 100], medium: [-500, 500], hard: [-10000, 10000] };
    const [minSize, maxSize] = sizes[difficulty as keyof typeof sizes] || sizes.medium;
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const size = rng.int(minSize, maxSize);
      const arr = Array.from({ length: size }, () => rng.int(minVal, maxVal));
      test_cases.push({
        input: JSON.stringify(arr),
        expected_output: String(arrayMax(arr)),
        points: 20,
      });
    }
    // Edge: all same values
    const sameVal = rng.int(minVal, maxVal);
    test_cases.push({ input: JSON.stringify(Array(5).fill(sameVal)), expected_output: String(sameVal), points: 20 });
    // Edge: single element
    const single = rng.int(minVal, maxVal);
    test_cases.push({ input: `[${single}]`, expected_output: String(single), points: 20 });

    return {
      title: 'Find Maximum Element',
      description: `Given an array of integers, find and return the maximum element.\n\nInput: An array of integers (guaranteed to have at least one element)\nOutput: The maximum integer in the array\n\nEdge cases:\n- All elements are the same\n- Array with negative numbers only\n- Single element array`,
      difficulty,
      category: 'arrays',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 3. Factorial
  (rng, difficulty) => {
    const ranges = { easy: [1, 10], medium: [5, 15], hard: [10, 20] };
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    const usedNums = new Set<number>();
    while (test_cases.length < 4) {
      const n = rng.int(minVal, maxVal);
      if (!usedNums.has(n)) {
        usedNums.add(n);
        test_cases.push({ input: String(n), expected_output: String(factorial(n)), points: 20 });
      }
    }
    // Edge cases
    test_cases.push({ input: '0', expected_output: '1', points: 20 });
    test_cases.push({ input: '1', expected_output: '1', points: 20 });

    return {
      title: 'Calculate Factorial',
      description: `Calculate the factorial of a non-negative integer n.\n\nFactorial of n (written as n!) is the product of all positive integers from 1 to n.\n\nInput: A non-negative integer n\nOutput: n! (n factorial)\n\nExamples:\n- 5! = 5 × 4 × 3 × 2 × 1 = 120\n- 0! = 1 (by definition)\n- 1! = 1`,
      difficulty,
      category: 'math',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 4. Fibonacci
  (rng, difficulty) => {
    const ranges = { easy: [5, 15], medium: [10, 25], hard: [20, 40] };
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    const usedNums = new Set<number>();
    while (test_cases.length < 4) {
      const n = rng.int(minVal, maxVal);
      if (!usedNums.has(n)) {
        usedNums.add(n);
        test_cases.push({ input: String(n), expected_output: String(fibonacci(n)), points: 20 });
      }
    }
    // Edge cases
    test_cases.push({ input: '0', expected_output: '0', points: 20 });
    test_cases.push({ input: '1', expected_output: '1', points: 20 });
    test_cases.push({ input: '2', expected_output: '1', points: 20 });

    return {
      title: 'Fibonacci Number',
      description: `Given n, return the nth Fibonacci number.\n\nThe Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, ...\nF(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)\n\nInput: A non-negative integer n\nOutput: The nth Fibonacci number\n\nEdge cases:\n- F(0) = 0\n- F(1) = 1`,
      difficulty,
      category: 'math',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 5. Prime Check
  (rng, difficulty) => {
    const ranges = { easy: [2, 100], medium: [2, 1000], hard: [2, 10000] };
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    // Add some primes
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499];
    const eligiblePrimes = primes.filter(p => p >= minVal && p <= maxVal);
    for (let i = 0; i < 3 && i < eligiblePrimes.length; i++) {
      const p = rng.choice(eligiblePrimes);
      test_cases.push({ input: String(p), expected_output: 'true', points: 20 });
    }
    // Add non-primes
    for (let i = 0; i < 3; i++) {
      let n = rng.int(minVal, maxVal);
      while (isPrime(n)) n = rng.int(minVal, maxVal);
      test_cases.push({ input: String(n), expected_output: 'false', points: 20 });
    }
    // Edge cases
    test_cases.push({ input: '1', expected_output: 'false', points: 20 });
    test_cases.push({ input: '2', expected_output: 'true', points: 20 });

    return {
      title: 'Is Prime?',
      description: `Determine if a given number is prime.\n\nA prime number is a natural number greater than 1 that is only divisible by 1 and itself.\n\nInput: A positive integer n\nOutput: "true" if n is prime, "false" otherwise\n\nEdge cases:\n- 1 is NOT prime\n- 2 is prime (the only even prime)`,
      difficulty,
      category: 'math',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 6. GCD
  (rng, difficulty) => {
    const ranges = { easy: [10, 100], medium: [50, 500], hard: [100, 5000] };
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const a = rng.int(minVal, maxVal);
      const b = rng.int(minVal, maxVal);
      test_cases.push({ input: `${a}\n${b}`, expected_output: String(gcd(a, b)), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: `${rng.int(10, 100)}\n${rng.int(10, 100)}`, expected_output: String(gcd(48, 18)), points: 20 });

    return {
      title: 'Greatest Common Divisor',
      description: `Find the Greatest Common Divisor (GCD) of two positive integers.\n\nThe GCD is the largest number that divides both numbers without a remainder.\n\nInput: Two positive integers a and b (on separate lines)\nOutput: The GCD of a and b\n\nExample: GCD(48, 18) = 6`,
      difficulty,
      category: 'math',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 7. Count Vowels
  (rng, difficulty) => {
    const lengths = { easy: [5, 15], medium: [15, 30], hard: [30, 60] };
    const [minLen, maxLen] = lengths[difficulty as keyof typeof lengths] || lengths.medium;

    const words = ['algorithm', 'programming', 'javascript', 'python', 'computer', 'science', 'education', 'university', 'beautiful', 'awesome', 'challenge', 'solution', 'development', 'interface', 'application', 'database', 'function', 'variable', 'iteration', 'recursion', 'optimization', 'efficiency', 'complexity', 'abstraction'];

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const numWords = rng.int(2, 5);
      const sentence = Array.from({ length: numWords }, () => rng.choice(words)).join(' ');
      test_cases.push({ input: sentence, expected_output: String(countVowels(sentence)), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: 'xyz', expected_output: '0', points: 20 });
    test_cases.push({ input: 'aeiou', expected_output: '5', points: 20 });
    test_cases.push({ input: 'AEIOU', expected_output: '5', points: 20 });

    return {
      title: 'Count Vowels',
      description: `Count the number of vowels (a, e, i, o, u) in a given string.\n\nInput: A string (can contain uppercase and lowercase letters)\nOutput: The count of vowels (case-insensitive)\n\nEdge cases:\n- Empty string returns 0\n- Handle both uppercase and lowercase\n- String with no vowels`,
      difficulty,
      category: 'strings',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 8. Palindrome Check
  (rng, difficulty) => {
    const palindromes = ['racecar', 'level', 'radar', 'refer', 'rotor', 'kayak', 'civic', 'madam', 'noon', 'deed'];
    const nonPalindromes = ['hello', 'world', 'python', 'coding', 'challenge', 'random', 'string', 'algorithm'];

    const test_cases = [];
    // Palindromes
    for (let i = 0; i < 3; i++) {
      test_cases.push({ input: rng.choice(palindromes), expected_output: 'true', points: 20 });
    }
    // Non-palindromes
    for (let i = 0; i < 3; i++) {
      test_cases.push({ input: rng.choice(nonPalindromes), expected_output: 'false', points: 20 });
    }
    // Edge cases
    test_cases.push({ input: 'a', expected_output: 'true', points: 20 });
    test_cases.push({ input: '', expected_output: 'true', points: 20 });
    if (difficulty !== 'easy') {
      test_cases.push({ input: 'A man a plan a canal Panama', expected_output: 'true', points: 20 });
    }

    return {
      title: 'Palindrome Check',
      description: `Check if a given string is a palindrome.\n\nA palindrome reads the same forwards and backwards.\n\nInput: A string\nOutput: "true" if palindrome, "false" otherwise\n\n${difficulty !== 'easy' ? 'Note: Ignore spaces and case when checking.' : 'Note: For easy mode, input will be simple lowercase words.'}\n\nEdge cases:\n- Single character is a palindrome\n- Empty string is a palindrome`,
      difficulty,
      category: 'strings',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 9. String Compression
  (rng, difficulty) => {
    const test_cases = [];
    const chars = 'abcdefgh';
    
    for (let i = 0; i < 5; i++) {
      let s = '';
      const numGroups = rng.int(3, 8);
      for (let j = 0; j < numGroups; j++) {
        const char = chars[rng.int(0, chars.length - 1)];
        const count = rng.int(1, 5);
        s += char.repeat(count);
      }
      test_cases.push({ input: s, expected_output: compressString(s), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: 'aaa', expected_output: 'a3', points: 20 });
    test_cases.push({ input: 'abcd', expected_output: 'a1b1c1d1', points: 20 });
    test_cases.push({ input: '', expected_output: '', points: 20 });

    return {
      title: 'String Compression',
      description: `Compress a string using run-length encoding.\n\nReplace consecutive repeated characters with the character followed by its count.\n\nInput: A string of lowercase letters\nOutput: Compressed string\n\nExamples:\n- "aabcccccaaa" → "a2b1c5a3"\n- "abcd" → "a1b1c1d1"\n\nEdge cases:\n- Empty string returns empty string\n- No consecutive repeats`,
      difficulty,
      category: 'strings',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 10. Remove Duplicates
  (rng, difficulty) => {
    const sizes = { easy: [5, 10], medium: [10, 20], hard: [20, 40] };
    const ranges = { easy: [1, 20], medium: [1, 50], hard: [1, 100] };
    const [minSize, maxSize] = sizes[difficulty as keyof typeof sizes] || sizes.medium;
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const size = rng.int(minSize, maxSize);
      const arr = Array.from({ length: size }, () => rng.int(minVal, maxVal));
      test_cases.push({
        input: JSON.stringify(arr),
        expected_output: JSON.stringify(removeDuplicates(arr)),
        points: 20,
      });
    }
    // Edge cases
    test_cases.push({ input: '[1,1,1,1]', expected_output: '[1]', points: 20 });
    test_cases.push({ input: '[1,2,3]', expected_output: '[1,2,3]', points: 20 });
    test_cases.push({ input: '[]', expected_output: '[]', points: 20 });

    return {
      title: 'Remove Duplicates',
      description: `Remove duplicate elements from an array while preserving the order of first occurrences.\n\nInput: An array of integers\nOutput: Array with duplicates removed (maintain first occurrence order)\n\nEdge cases:\n- Empty array\n- Array with all same elements\n- Array with no duplicates`,
      difficulty,
      category: 'arrays',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 11. Second Largest
  (rng, difficulty) => {
    const sizes = { easy: [5, 10], medium: [10, 20], hard: [20, 50] };
    const ranges = { easy: [1, 100], medium: [-100, 100], hard: [-1000, 1000] };
    const [minSize, maxSize] = sizes[difficulty as keyof typeof sizes] || sizes.medium;
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    for (let i = 0; i < 4; i++) {
      const size = rng.int(minSize, maxSize);
      const arr = Array.from({ length: size }, () => rng.int(minVal, maxVal));
      const result = secondLargest(arr);
      test_cases.push({
        input: JSON.stringify(arr),
        expected_output: result === null ? 'null' : String(result),
        points: 20,
      });
    }
    // Edge cases
    test_cases.push({ input: '[5,5,5,5]', expected_output: 'null', points: 20 });
    test_cases.push({ input: '[1,2]', expected_output: '1', points: 20 });
    test_cases.push({ input: '[3,1,4,1,5,9,2,6]', expected_output: '6', points: 20 });

    return {
      title: 'Second Largest Element',
      description: `Find the second largest element in an array.\n\nInput: An array of integers\nOutput: The second largest unique element, or "null" if it doesn't exist\n\nEdge cases:\n- All elements are the same → null\n- Less than 2 unique elements → null\n- Handle duplicates (second largest must be strictly less than max)`,
      difficulty,
      category: 'arrays',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 12. Rotate Array
  (rng, difficulty) => {
    const sizes = { easy: [5, 8], medium: [8, 15], hard: [15, 25] };
    const [minSize, maxSize] = sizes[difficulty as keyof typeof sizes] || sizes.medium;

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const size = rng.int(minSize, maxSize);
      const arr = Array.from({ length: size }, () => rng.int(1, 20));
      const k = rng.int(1, size * 2); // k can be larger than array size
      test_cases.push({
        input: `${JSON.stringify(arr)}\n${k}`,
        expected_output: JSON.stringify(rotateArray(arr, k)),
        points: 20,
      });
    }
    // Edge cases
    test_cases.push({ input: '[1,2,3,4,5]\n0', expected_output: '[1,2,3,4,5]', points: 20 });
    test_cases.push({ input: '[1,2,3]\n3', expected_output: '[1,2,3]', points: 20 });
    test_cases.push({ input: '[1]\n5', expected_output: '[1]', points: 20 });

    return {
      title: 'Rotate Array Left',
      description: `Rotate an array to the left by k positions.\n\nInput: An array and an integer k (on separate lines)\nOutput: The rotated array\n\nExample: [1,2,3,4,5] rotated by 2 → [3,4,5,1,2]\n\nEdge cases:\n- k = 0 (no rotation)\n- k = array length (same as original)\n- k > array length (use k % length)\n- Single element array`,
      difficulty,
      category: 'arrays',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 13. Find Missing Number
  (rng, difficulty) => {
    const ranges = { easy: [10, 20], medium: [50, 100], hard: [100, 500] };
    const [minN, maxN] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const n = rng.int(minN, maxN);
      const missing = rng.int(1, n);
      const arr = Array.from({ length: n }, (_, i) => i + 1).filter(x => x !== missing);
      const shuffled = rng.shuffle(arr);
      test_cases.push({
        input: `${JSON.stringify(shuffled)}\n${n}`,
        expected_output: String(missing),
        points: 20,
      });
    }

    return {
      title: 'Find Missing Number',
      description: `Given an array containing n-1 distinct numbers from 1 to n, find the missing number.\n\nInput: An array of n-1 numbers and n (on separate lines)\nOutput: The missing number\n\nExample: Array [1,2,4,5], n=5 → Missing is 3\n\nHint: Use the formula for sum of 1 to n: n*(n+1)/2`,
      difficulty,
      category: 'arrays',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 14. Count Words
  (rng, difficulty) => {
    const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'hello', 'world', 'coding', 'is', 'fun', 'programming', 'challenge', 'algorithm', 'data', 'structure'];

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const numWords = rng.int(3, 10);
      const sentence = Array.from({ length: numWords }, () => rng.choice(words)).join(' ');
      test_cases.push({ input: sentence, expected_output: String(countWords(sentence)), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: 'hello', expected_output: '1', points: 20 });
    test_cases.push({ input: '  spaces   everywhere  ', expected_output: '2', points: 20 });
    test_cases.push({ input: '', expected_output: '0', points: 20 });

    return {
      title: 'Count Words',
      description: `Count the number of words in a string.\n\nWords are separated by spaces. Multiple consecutive spaces should be treated as a single separator.\n\nInput: A string\nOutput: Number of words\n\nEdge cases:\n- Empty string → 0\n- Extra spaces between/around words\n- Single word`,
      difficulty,
      category: 'strings',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 15. Reverse Words
  (rng, difficulty) => {
    const words = ['hello', 'world', 'this', 'is', 'a', 'test', 'coding', 'challenge', 'reverse', 'words'];

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const numWords = rng.int(3, 7);
      const sentence = Array.from({ length: numWords }, () => rng.choice(words)).join(' ');
      test_cases.push({ input: sentence, expected_output: reverseWords(sentence), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: 'single', expected_output: 'single', points: 20 });
    test_cases.push({ input: 'two words', expected_output: 'words two', points: 20 });

    return {
      title: 'Reverse Words in String',
      description: `Reverse the order of words in a string.\n\nInput: A string of words separated by spaces\nOutput: String with words in reverse order\n\nExample: "hello world" → "world hello"\n\nNote: Preserve single spaces between words in output.`,
      difficulty,
      category: 'strings',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 16. LCM
  (rng, difficulty) => {
    const ranges = { easy: [2, 20], medium: [10, 100], hard: [50, 500] };
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const a = rng.int(minVal, maxVal);
      const b = rng.int(minVal, maxVal);
      test_cases.push({ input: `${a}\n${b}`, expected_output: String(lcm(a, b)), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: '4\n6', expected_output: '12', points: 20 });
    test_cases.push({ input: '5\n7', expected_output: '35', points: 20 }); // coprime

    return {
      title: 'Least Common Multiple',
      description: `Find the Least Common Multiple (LCM) of two positive integers.\n\nThe LCM is the smallest positive integer divisible by both numbers.\n\nInput: Two positive integers a and b (on separate lines)\nOutput: The LCM of a and b\n\nHint: LCM(a,b) = (a*b) / GCD(a,b)`,
      difficulty,
      category: 'math',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 17. Title Case
  (rng, difficulty) => {
    const words = ['hello', 'world', 'the', 'quick', 'brown', 'fox', 'programming', 'is', 'fun'];

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const numWords = rng.int(3, 6);
      const sentence = Array.from({ length: numWords }, () => rng.choice(words)).join(' ');
      test_cases.push({ input: sentence, expected_output: titleCase(sentence), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: 'HELLO WORLD', expected_output: 'Hello World', points: 20 });
    test_cases.push({ input: 'a', expected_output: 'A', points: 20 });

    return {
      title: 'Title Case',
      description: `Convert a string to title case.\n\nTitle case means the first letter of each word is capitalized, and the rest are lowercase.\n\nInput: A string\nOutput: String in title case\n\nExample: "hello world" → "Hello World"`,
      difficulty,
      category: 'strings',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 18. Merge Sorted Arrays
  (rng, difficulty) => {
    const sizes = { easy: [3, 6], medium: [5, 10], hard: [10, 20] };
    const [minSize, maxSize] = sizes[difficulty as keyof typeof sizes] || sizes.medium;

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const size1 = rng.int(minSize, maxSize);
      const size2 = rng.int(minSize, maxSize);
      const arr1 = Array.from({ length: size1 }, () => rng.int(1, 50)).sort((a, b) => a - b);
      const arr2 = Array.from({ length: size2 }, () => rng.int(1, 50)).sort((a, b) => a - b);
      test_cases.push({
        input: `${JSON.stringify(arr1)}\n${JSON.stringify(arr2)}`,
        expected_output: JSON.stringify(mergeSortedArrays(arr1, arr2)),
        points: 20,
      });
    }
    // Edge cases
    test_cases.push({ input: '[]\n[1,2,3]', expected_output: '[1,2,3]', points: 20 });
    test_cases.push({ input: '[1,2,3]\n[]', expected_output: '[1,2,3]', points: 20 });

    return {
      title: 'Merge Two Sorted Arrays',
      description: `Merge two sorted arrays into one sorted array.\n\nInput: Two sorted arrays (on separate lines)\nOutput: A single sorted array containing all elements\n\nExample: [1,3,5] and [2,4,6] → [1,2,3,4,5,6]\n\nEdge cases:\n- One or both arrays empty\n- Arrays of different sizes`,
      difficulty,
      category: 'arrays',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 19. Sum of Digits
  (rng, difficulty) => {
    const ranges = { easy: [10, 999], medium: [1000, 99999], hard: [100000, 999999999] };
    const [minVal, maxVal] = ranges[difficulty as keyof typeof ranges] || ranges.medium;

    const sumDigits = (n: number): number => {
      let sum = 0;
      n = Math.abs(n);
      while (n > 0) {
        sum += n % 10;
        n = Math.floor(n / 10);
      }
      return sum;
    };

    const test_cases = [];
    for (let i = 0; i < 5; i++) {
      const n = rng.int(minVal, maxVal);
      test_cases.push({ input: String(n), expected_output: String(sumDigits(n)), points: 20 });
    }
    // Edge cases
    test_cases.push({ input: '0', expected_output: '0', points: 20 });
    test_cases.push({ input: '9', expected_output: '9', points: 20 });

    return {
      title: 'Sum of Digits',
      description: `Calculate the sum of all digits in a number.\n\nInput: A non-negative integer\nOutput: Sum of its digits\n\nExample: 12345 → 1+2+3+4+5 = 15`,
      difficulty,
      category: 'math',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },

  // 20. Count Character Frequency
  (rng, difficulty) => {
    const test_cases = [];
    
    for (let i = 0; i < 4; i++) {
      const len = rng.int(10, 30);
      const s = rng.string(len, 'abcde');
      const targetChar = rng.choice(['a', 'b', 'c', 'd', 'e']);
      const count = (s.match(new RegExp(targetChar, 'g')) || []).length;
      test_cases.push({
        input: `${s}\n${targetChar}`,
        expected_output: String(count),
        points: 20,
      });
    }
    // Edge cases
    test_cases.push({ input: 'hello\nz', expected_output: '0', points: 20 });
    test_cases.push({ input: 'aaa\na', expected_output: '3', points: 20 });

    return {
      title: 'Count Character Frequency',
      description: `Count how many times a specific character appears in a string.\n\nInput: A string and a character to find (on separate lines)\nOutput: The count of that character\n\nNote: Case-sensitive matching.`,
      difficulty,
      category: 'strings',
      test_cases: rng.shuffle(test_cases).slice(0, 5),
    };
  },
];

// Generate a procedurally created daily challenge
function generateDailyChallenge(dateStr: string): GeneratedChallenge {
  const seed = getDailySeed(dateStr);
  const rng = new SeededRandom(seed);

  // Determine difficulty based on day of week
  const dayOfWeek = new Date(dateStr).getDay();
  const difficulties = ['easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard'];
  const difficulty = difficulties[dayOfWeek];

  // Select a challenge generator based on the seed
  const generatorIndex = Math.floor(rng.next() * challengeGenerators.length);
  const generator = challengeGenerators[generatorIndex];

  return generator(rng, difficulty);
}

// Save generated challenge to database
async function saveGeneratedChallenge(dateStr: string, generated: GeneratedChallenge) {
  const xpRewards: Record<string, number> = {
    easy: 50,
    medium: 100,
    hard: 200,
    expert: 500,
  };

  const { data: dailyChallenge, error } = await supabase
    .from("daily_challenges")
    .insert({
      challenge_date: dateStr,
      title: generated.title,
      description: generated.description,
      difficulty: generated.difficulty,
      category: generated.category,
      test_cases: generated.test_cases,
      starter_code: {},
      allowed_languages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'],
      time_limit_minutes: generated.difficulty === 'hard' ? 45 : generated.difficulty === 'medium' ? 30 : 20,
      xp_reward: xpRewards[generated.difficulty] || 100,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving daily challenge:", error);
    return null;
  }

  return dailyChallenge;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;
    const today = new Date().toISOString().split('T')[0];

    // Get today's challenge
    let { data: challenge, error } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("challenge_date", today)
      .single();

    // If no challenge exists for today, generate and save one
    if (error || !challenge) {
      const generated = generateDailyChallenge(today);
      challenge = await saveGeneratedChallenge(today, generated);
      
      if (!challenge) {
        // Return the generated challenge directly if save failed
        return NextResponse.json({
          challenge: {
            id: `generated-${today}`,
            challenge_date: today,
            ...generated,
            time_limit_minutes: generated.difficulty === 'hard' ? 45 : generated.difficulty === 'medium' ? 30 : 20,
            xp_reward: generated.difficulty === 'hard' ? 200 : generated.difficulty === 'medium' ? 100 : 50,
            allowed_languages: ['python', 'javascript', 'java', 'cpp', 'go', 'rust'],
          },
          userSubmission: null,
          streakInfo: null,
          stats: { totalSolvers: 0 },
          isToday: true,
          isGenerated: true,
        });
      }
    }

    // Check if user already completed today's challenge
    let userSubmission = null;
    let streakInfo = null;
    
    if (userId) {
      const { data: submission } = await supabase
        .from("daily_submissions")
        .select("*")
        .eq("daily_challenge_id", challenge.id)
        .eq("user_id", userId)
        .single();
      userSubmission = submission;

      // Get user's streak
      const { data: streak } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();
      streakInfo = streak;
    }

    // Get global stats for today
    const { count: totalSolvers } = await supabase
      .from("daily_submissions")
      .select("*", { count: "exact", head: true })
      .eq("daily_challenge_id", challenge.id)
      .eq("passed", true);

    return NextResponse.json({
      challenge,
      userSubmission,
      streakInfo,
      stats: {
        totalSolvers: totalSolvers || 0,
      },
      isToday: true,
    });
  } catch (error) {
    console.error("Error in GET /api/daily:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { code, language, challengeId } = await request.json();

    if (!code || !language || !challengeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if user already submitted
    const { data: existingSubmission } = await supabase
      .from("daily_submissions")
      .select("*")
      .eq("daily_challenge_id", challengeId)
      .eq("user_id", userId)
      .single();

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted a solution for this challenge" },
        { status: 400 }
      );
    }

    // Run the code against test cases
    const testCases = challenge.test_cases as Array<{
      input: string;
      expected_output: string;
      points: number;
    }>;

    let totalScore = 0;
    let passedAll = true;
    const results: Array<{
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      points: number;
    }> = [];
    let totalExecutionTime = 0;

    for (const testCase of testCases) {
      try {
        const result = await executeCode(code, language, testCase.input);
        const actual = result.output?.trim() || "";
        const expected = testCase.expected_output.trim();
        const passed = actual === expected;

        if (passed) {
          totalScore += testCase.points;
        } else {
          passedAll = false;
        }

        totalExecutionTime += result.executionTime || 0;

        results.push({
          input: testCase.input,
          expected,
          actual,
          passed,
          points: passed ? testCase.points : 0,
        });
      } catch (err) {
        passedAll = false;
        results.push({
          input: testCase.input,
          expected: testCase.expected_output,
          actual: err instanceof Error ? err.message : "Execution error",
          passed: false,
          points: 0,
        });
      }
    }

    // Save submission
    const { data: submission, error: submissionError } = await supabase
      .from("daily_submissions")
      .insert({
        daily_challenge_id: challengeId,
        user_id: userId,
        code,
        language,
        score: totalScore,
        passed: passedAll,
        execution_time: totalExecutionTime,
      })
      .select()
      .single();

    if (submissionError) {
      console.error("Error saving submission:", submissionError);
      return NextResponse.json(
        { error: "Failed to save submission" },
        { status: 500 }
      );
    }

    // Update streak if passed
    let streakResult = null;
    if (passedAll) {
      const { data: streakData } = await supabase.rpc("update_user_streak", {
        p_user_id: userId,
        p_xp_earned: challenge.xp_reward || 100,
      });
      streakResult = streakData?.[0];

      // Check for streak achievements
      if (streakResult) {
        await supabase.rpc("check_achievements", {
          p_user_id: userId,
          p_category: "streak",
          p_metric_type: "streak",
          p_metric_value: streakResult.new_streak,
        });

        // Check daily count achievements
        const { data: streakInfo } = await supabase
          .from("user_streaks")
          .select("total_daily_completed")
          .eq("user_id", userId)
          .single();

        if (streakInfo) {
          await supabase.rpc("check_achievements", {
            p_user_id: userId,
            p_category: "streak",
            p_metric_type: "count",
            p_metric_value: streakInfo.total_daily_completed,
          });
        }
      }
    }

    return NextResponse.json({
      submission,
      results,
      totalScore,
      passed: passedAll,
      streak: streakResult,
      xpEarned: passedAll ? Math.round((challenge.xp_reward || 100) * (streakResult?.streak_bonus || 1)) : 0,
    });
  } catch (error) {
    console.error("Error in POST /api/daily:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
