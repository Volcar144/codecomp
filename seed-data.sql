-- =============================================
-- CODECOMP SEED DATA
-- Run this after creating the schema
-- =============================================

-- =============================================
-- TUTORIAL LESSONS - Additional lessons
-- =============================================

INSERT INTO tutorial_lessons (slug, title, description, category, difficulty, order_index, content, hints, starter_code, solution_code, test_cases, xp_reward, estimated_minutes) VALUES

-- More Algorithms
('sorting-basics', 'Sorting Basics', 'Learn to sort arrays', 'algorithms', 'intermediate', 3,
'# Sorting Algorithms

Sorting is arranging elements in a specific order.

## What you''ll learn
- Bubble sort concept
- Built-in sorting
- Custom comparators

## Instructions
Read N numbers and print them in ascending order, space-separated.',
'["You can use built-in sort", "Python: sorted() or .sort()", "JavaScript: .sort((a,b) => a-b)"]',
'{"python": "# Sort the numbers\n", "javascript": "// Sort the numbers\n"}',
'{"python": "n = int(input())\narr = list(map(int, input().split()))\nprint(\" \".join(map(str, sorted(arr))))", "javascript": "const lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst arr = lines[1].split(\" \").map(Number).sort((a, b) => a - b);\nconsole.log(arr.join(\" \"));"}',
'[{"input": "5\n3 1 4 1 5", "expected_output": "1 1 3 4 5", "points": 50}, {"input": "3\n9 2 7", "expected_output": "2 7 9", "points": 50}]',
40, 15),

('fibonacci', 'Fibonacci Sequence', 'Generate Fibonacci numbers', 'algorithms', 'intermediate', 4,
'# Fibonacci Sequence

The Fibonacci sequence: each number is the sum of the two preceding ones.

## What you''ll learn
- Recursive thinking
- Iterative solutions
- Dynamic programming intro

## Instructions
Given N, print the Nth Fibonacci number (0-indexed: F(0)=0, F(1)=1).',
'["F(n) = F(n-1) + F(n-2)", "Use iteration to avoid timeout", "Start with F(0)=0, F(1)=1"]',
'{"python": "# Calculate Fibonacci\n", "javascript": "// Calculate Fibonacci\n"}',
'{"python": "def fib(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\nn = int(input())\nprint(fib(n))", "javascript": "function fib(n) {\n    if (n <= 1) return n;\n    let a = 0, b = 1;\n    for (let i = 2; i <= n; i++) [a, b] = [b, a + b];\n    return b;\n}\nconst n = parseInt(require(\"fs\").readFileSync(0, \"utf-8\").trim());\nconsole.log(fib(n));"}',
'[{"input": "10", "expected_output": "55", "points": 34}, {"input": "0", "expected_output": "0", "points": 33}, {"input": "20", "expected_output": "6765", "points": 33}]',
45, 20),

('gcd', 'Greatest Common Divisor', 'Find the GCD of two numbers', 'algorithms', 'intermediate', 5,
'# Greatest Common Divisor

The GCD is the largest number that divides both numbers evenly.

## What you''ll learn
- Euclidean algorithm
- Mathematical algorithms
- Recursion vs iteration

## Instructions
Given two numbers A and B, print their GCD.',
'["Use Euclidean algorithm: gcd(a,b) = gcd(b, a%b)", "Base case: gcd(a, 0) = a", "Or use math.gcd in Python"]',
'{"python": "# Find GCD\n", "javascript": "// Find GCD\n"}',
'{"python": "import math\na, b = map(int, input().split())\nprint(math.gcd(a, b))", "javascript": "function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }\nconst [a, b] = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\" \").map(Number);\nconsole.log(gcd(a, b));"}',
'[{"input": "12 8", "expected_output": "4", "points": 34}, {"input": "17 13", "expected_output": "1", "points": 33}, {"input": "100 25", "expected_output": "25", "points": 33}]',
40, 15),

-- Data Structures
('stack', 'Stack Data Structure', 'Learn the LIFO data structure', 'data-structures', 'intermediate', 1,
'# Stack

A stack is a Last-In-First-Out (LIFO) data structure.

## What you''ll learn
- Push and pop operations
- LIFO principle
- Stack applications

## Instructions
Implement a simple bracket validator. Given a string of brackets, return `valid` if all brackets match, `invalid` otherwise.
Valid brackets: (), [], {}',
'["Use a stack to track opening brackets", "When closing bracket found, check if it matches top of stack", "Stack should be empty at the end"]',
'{"python": "# Bracket validation\n", "javascript": "// Bracket validation\n"}',
'{"python": "def is_valid(s):\n    stack = []\n    pairs = {\")\":\"(\", \"]\":\"[\", \"}\":\"{\"}\n    for c in s:\n        if c in \"([{\":\n            stack.append(c)\n        elif c in \")]}\":\n            if not stack or stack[-1] != pairs[c]:\n                return False\n            stack.pop()\n    return len(stack) == 0\n\ns = input()\nprint(\"valid\" if is_valid(s) else \"invalid\")", "javascript": "const s = require(\"fs\").readFileSync(0, \"utf-8\").trim();\nconst stack = [];\nconst pairs = {\")\": \"(\", \"]\": \"[\", \"}\": \"{\"};\nlet valid = true;\nfor (const c of s) {\n    if (\"([{\".includes(c)) stack.push(c);\n    else if (\")]}\".includes(c)) {\n        if (!stack.length || stack.pop() !== pairs[c]) { valid = false; break; }\n    }\n}\nconsole.log(valid && !stack.length ? \"valid\" : \"invalid\");"}',
'[{"input": "()", "expected_output": "valid", "points": 25}, {"input": "([{}])", "expected_output": "valid", "points": 25}, {"input": "([)]", "expected_output": "invalid", "points": 25}, {"input": "((", "expected_output": "invalid", "points": 25}]',
50, 20),

('queue', 'Queue Data Structure', 'Learn the FIFO data structure', 'data-structures', 'intermediate', 2,
'# Queue

A queue is a First-In-First-Out (FIFO) data structure.

## What you''ll learn
- Enqueue and dequeue
- FIFO principle
- Queue applications

## Instructions
Simulate a queue of N people. Process operations:
- `enqueue X` - add person X
- `dequeue` - remove and print the first person
Print the name of each dequeued person.',
'["Use a list/array as queue", "enqueue adds to end", "dequeue removes from front"]',
'{"python": "# Queue simulation\n", "javascript": "// Queue simulation\n"}',
'{"python": "from collections import deque\nn = int(input())\nq = deque()\nfor _ in range(n):\n    op = input().split()\n    if op[0] == \"enqueue\":\n        q.append(op[1])\n    else:\n        print(q.popleft())", "javascript": "const lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst n = parseInt(lines[0]);\nconst q = [];\nfor (let i = 1; i <= n; i++) {\n    const [op, name] = lines[i].split(\" \");\n    if (op === \"enqueue\") q.push(name);\n    else console.log(q.shift());\n}"}',
'[{"input": "5\nenqueue Alice\nenqueue Bob\ndequeue\nenqueue Charlie\ndequeue", "expected_output": "Alice\nBob", "points": 100}]',
50, 18),

('hashmap', 'Hash Maps', 'Learn key-value storage', 'data-structures', 'intermediate', 3,
'# Hash Maps (Dictionaries)

Hash maps store key-value pairs for O(1) average lookup.

## What you''ll learn
- Key-value pairs
- O(1) lookup
- Counting patterns

## Instructions
Count word frequencies. Given text on multiple lines (until empty line), print each unique word and its count, sorted alphabetically.',
'["Use a dictionary/object", "Split text into words", "Increment count for each word"]',
'{"python": "# Count word frequencies\n", "javascript": "// Count word frequencies\n"}',
'{"python": "import sys\nwords = {}\nfor line in sys.stdin:\n    line = line.strip()\n    if not line:\n        break\n    for word in line.lower().split():\n        words[word] = words.get(word, 0) + 1\nfor word in sorted(words):\n    print(f\"{word}: {words[word]}\")", "javascript": "const text = require(\"fs\").readFileSync(0, \"utf-8\").split(\"\\n\\n\")[0].toLowerCase();\nconst words = {};\ntext.split(/\\s+/).filter(w => w).forEach(w => words[w] = (words[w] || 0) + 1);\nObject.keys(words).sort().forEach(w => console.log(`${w}: ${words[w]}`));"}',
'[{"input": "hello world\nhello", "expected_output": "hello: 2\nworld: 1", "points": 100}]',
55, 20),

-- Advanced
('recursion', 'Recursion', 'Functions that call themselves', 'algorithms', 'intermediate', 6,
'# Recursion

Recursion is when a function calls itself to solve smaller subproblems.

## What you''ll learn
- Base cases
- Recursive calls
- Call stack

## Instructions
Calculate factorial of N using recursion. factorial(n) = n * factorial(n-1), factorial(0) = 1',
'["Define base case: n = 0 returns 1", "Recursive case: n * factorial(n-1)", "Don''t forget to call yourself!"]',
'{"python": "# Recursive factorial\n", "javascript": "// Recursive factorial\n"}',
'{"python": "def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)\n\nn = int(input())\nprint(factorial(n))", "javascript": "function factorial(n) {\n    if (n === 0) return 1;\n    return n * factorial(n - 1);\n}\nconst n = parseInt(require(\"fs\").readFileSync(0, \"utf-8\").trim());\nconsole.log(factorial(n));"}',
'[{"input": "5", "expected_output": "120", "points": 34}, {"input": "0", "expected_output": "1", "points": 33}, {"input": "10", "expected_output": "3628800", "points": 33}]',
45, 18),

('dynamic-programming', 'Dynamic Programming Intro', 'Optimize recursive solutions', 'algorithms', 'advanced', 7,
'# Dynamic Programming

DP optimizes recursion by storing previously computed results.

## What you''ll learn
- Memoization
- Overlapping subproblems
- Bottom-up approach

## Instructions
Climbing stairs: You can climb 1 or 2 steps at a time. Given N stairs, how many distinct ways to reach the top?',
'["This is similar to Fibonacci", "ways(n) = ways(n-1) + ways(n-2)", "ways(1) = 1, ways(2) = 2"]',
'{"python": "# Climbing stairs\n", "javascript": "// Climbing stairs\n"}',
'{"python": "def climb(n):\n    if n <= 2:\n        return n\n    dp = [0] * (n + 1)\n    dp[1], dp[2] = 1, 2\n    for i in range(3, n + 1):\n        dp[i] = dp[i-1] + dp[i-2]\n    return dp[n]\n\nn = int(input())\nprint(climb(n))", "javascript": "function climb(n) {\n    if (n <= 2) return n;\n    let a = 1, b = 2;\n    for (let i = 3; i <= n; i++) [a, b] = [b, a + b];\n    return b;\n}\nconst n = parseInt(require(\"fs\").readFileSync(0, \"utf-8\").trim());\nconsole.log(climb(n));"}',
'[{"input": "3", "expected_output": "3", "points": 34}, {"input": "5", "expected_output": "8", "points": 33}, {"input": "10", "expected_output": "89", "points": 33}]',
60, 25),

('graph-bfs', 'Breadth-First Search', 'Explore graphs level by level', 'algorithms', 'advanced', 8,
'# Breadth-First Search (BFS)

BFS explores all neighbors before moving deeper.

## What you''ll learn
- Graph traversal
- Queue-based exploration
- Shortest path in unweighted graphs

## Instructions
Given a graph and start node, print nodes in BFS order.
Input: N nodes, M edges, then M edges as "u v", then start node.',
'["Use a queue for BFS", "Mark visited nodes", "Process level by level"]',
'{"python": "# BFS traversal\n", "javascript": "// BFS traversal\n"}',
'{"python": "from collections import deque, defaultdict\n\nlines = open(0).read().split(\"\\n\")\nn, m = map(int, lines[0].split())\ngraph = defaultdict(list)\nfor i in range(1, m + 1):\n    u, v = map(int, lines[i].split())\n    graph[u].append(v)\n    graph[v].append(u)\nstart = int(lines[m + 1])\n\nvisited = set([start])\nqueue = deque([start])\nresult = []\nwhile queue:\n    node = queue.popleft()\n    result.append(str(node))\n    for neighbor in sorted(graph[node]):\n        if neighbor not in visited:\n            visited.add(neighbor)\n            queue.append(neighbor)\nprint(\" \".join(result))", "javascript": "const lines = require(\"fs\").readFileSync(0, \"utf-8\").trim().split(\"\\n\");\nconst [n, m] = lines[0].split(\" \").map(Number);\nconst graph = {};\nfor (let i = 1; i <= m; i++) {\n    const [u, v] = lines[i].split(\" \").map(Number);\n    (graph[u] = graph[u] || []).push(v);\n    (graph[v] = graph[v] || []).push(u);\n}\nconst start = parseInt(lines[m + 1]);\nconst visited = new Set([start]);\nconst queue = [start];\nconst result = [];\nwhile (queue.length) {\n    const node = queue.shift();\n    result.push(node);\n    for (const neighbor of (graph[node] || []).sort((a,b) => a-b)) {\n        if (!visited.has(neighbor)) {\n            visited.add(neighbor);\n            queue.push(neighbor);\n        }\n    }\n}\nconsole.log(result.join(\" \"));"}',
'[{"input": "4 4\n1 2\n1 3\n2 4\n3 4\n1", "expected_output": "1 2 3 4", "points": 100}]',
70, 30)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  hints = EXCLUDED.hints,
  starter_code = EXCLUDED.starter_code,
  solution_code = EXCLUDED.solution_code,
  test_cases = EXCLUDED.test_cases;

-- =============================================
-- SAMPLE DAILY CHALLENGES
-- =============================================

INSERT INTO daily_challenges (id, title, description, difficulty, xp_reward, time_limit_minutes, active_date, starter_code) VALUES
(uuid_generate_v4(), 'Sum of Digits', 'Given a number N, calculate the sum of its digits.', 'easy', 25, 15, CURRENT_DATE, '{"python": "# Sum digits of N\nn = int(input())\n", "javascript": "const n = parseInt(require(\"fs\").readFileSync(0, \"utf-8\").trim());\n"}'),
(uuid_generate_v4(), 'Prime Check', 'Determine if a number N is prime. Print "prime" or "not prime".', 'easy', 30, 20, CURRENT_DATE + INTERVAL '1 day', '{"python": "# Check if N is prime\nn = int(input())\n", "javascript": "const n = parseInt(require(\"fs\").readFileSync(0, \"utf-8\").trim());\n"}'),
(uuid_generate_v4(), 'Count Vowels', 'Count the number of vowels (a,e,i,o,u) in a string (case-insensitive).', 'easy', 25, 15, CURRENT_DATE + INTERVAL '2 days', '{"python": "# Count vowels\ns = input()\n", "javascript": "const s = require(\"fs\").readFileSync(0, \"utf-8\").trim();\n"}'),
(uuid_generate_v4(), 'Array Rotation', 'Rotate an array K positions to the right.', 'medium', 50, 25, CURRENT_DATE + INTERVAL '3 days', '{"python": "# Rotate array\n", "javascript": "// Rotate array\n"}'),
(uuid_generate_v4(), 'Anagram Check', 'Check if two strings are anagrams of each other.', 'medium', 50, 25, CURRENT_DATE + INTERVAL '4 days', '{"python": "# Check anagrams\n", "javascript": "// Check anagrams\n"}'),
(uuid_generate_v4(), 'Matrix Diagonal Sum', 'Calculate the sum of both diagonals of an N×N matrix.', 'medium', 60, 30, CURRENT_DATE + INTERVAL '5 days', '{"python": "# Diagonal sum\n", "javascript": "// Diagonal sum\n"}'),
(uuid_generate_v4(), 'Longest Substring', 'Find the length of the longest substring without repeating characters.', 'hard', 100, 45, CURRENT_DATE + INTERVAL '6 days', '{"python": "# Longest substring without repeating\n", "javascript": "// Longest substring without repeating\n"}')
ON CONFLICT DO NOTHING;

-- Add test cases for daily challenges
INSERT INTO daily_challenge_test_cases (challenge_id, input, expected_output, is_hidden, points)
SELECT id, '123', '6', false, 50 FROM daily_challenges WHERE title = 'Sum of Digits'
ON CONFLICT DO NOTHING;

INSERT INTO daily_challenge_test_cases (challenge_id, input, expected_output, is_hidden, points)
SELECT id, '9999', '36', true, 50 FROM daily_challenges WHERE title = 'Sum of Digits'
ON CONFLICT DO NOTHING;

INSERT INTO daily_challenge_test_cases (challenge_id, input, expected_output, is_hidden, points)
SELECT id, '17', 'prime', false, 50 FROM daily_challenges WHERE title = 'Prime Check'
ON CONFLICT DO NOTHING;

INSERT INTO daily_challenge_test_cases (challenge_id, input, expected_output, is_hidden, points)
SELECT id, '15', 'not prime', true, 50 FROM daily_challenges WHERE title = 'Prime Check'
ON CONFLICT DO NOTHING;

-- =============================================
-- SAMPLE CODE TEMPLATES
-- =============================================

INSERT INTO code_templates (name, language, code, description, category, tags, is_starter, use_count) VALUES
-- Python templates
('Python - Fast I/O', 'python', 'import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    solve()', 'Fast input for competitive programming', 'competitive', ARRAY['fast-io', 'optimization'], true, 0),
('Python - BFS Template', 'python', 'from collections import deque\n\ndef bfs(graph, start):\n    visited = set([start])\n    queue = deque([start])\n    \n    while queue:\n        node = queue.popleft()\n        # Process node\n        \n        for neighbor in graph[node]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append(neighbor)\n    \n    return visited', 'Breadth-first search template', 'algorithms', ARRAY['bfs', 'graph', 'traversal'], true, 0),
('Python - DFS Template', 'python', 'def dfs(graph, node, visited=None):\n    if visited is None:\n        visited = set()\n    \n    visited.add(node)\n    # Process node\n    \n    for neighbor in graph[node]:\n        if neighbor not in visited:\n            dfs(graph, neighbor, visited)\n    \n    return visited', 'Depth-first search template', 'algorithms', ARRAY['dfs', 'graph', 'traversal', 'recursion'], true, 0),
('Python - Binary Search', 'python', 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    \n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    \n    return -1  # Not found', 'Binary search implementation', 'algorithms', ARRAY['binary-search', 'search', 'divide-conquer'], true, 0),
('Python - DP Template', 'python', '# Memoization approach\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef dp(state):\n    # Base case\n    if base_condition:\n        return base_value\n    \n    # Recursive case\n    result = initial_value\n    for transition in transitions:\n        result = optimal(result, dp(next_state))\n    \n    return result', 'Dynamic programming with memoization', 'algorithms', ARRAY['dp', 'memoization', 'optimization'], true, 0),

-- JavaScript templates
('JavaScript - Fast I/O', 'javascript', 'const input = require("fs").readFileSync(0, "utf-8").trim().split("\\n");\nlet line = 0;\nconst readline = () => input[line++];\n\nfunction solve() {\n    // Your code here\n}\n\nsolve();', 'Fast input for competitive programming', 'competitive', ARRAY['fast-io', 'optimization'], true, 0),
('JavaScript - BFS Template', 'javascript', 'function bfs(graph, start) {\n    const visited = new Set([start]);\n    const queue = [start];\n    \n    while (queue.length > 0) {\n        const node = queue.shift();\n        // Process node\n        \n        for (const neighbor of graph[node] || []) {\n            if (!visited.has(neighbor)) {\n                visited.add(neighbor);\n                queue.push(neighbor);\n            }\n        }\n    }\n    \n    return visited;\n}', 'Breadth-first search template', 'algorithms', ARRAY['bfs', 'graph', 'traversal'], true, 0),
('JavaScript - DFS Template', 'javascript', 'function dfs(graph, node, visited = new Set()) {\n    visited.add(node);\n    // Process node\n    \n    for (const neighbor of graph[node] || []) {\n        if (!visited.has(neighbor)) {\n            dfs(graph, neighbor, visited);\n        }\n    }\n    \n    return visited;\n}', 'Depth-first search template', 'algorithms', ARRAY['dfs', 'graph', 'traversal', 'recursion'], true, 0),
('JavaScript - Binary Search', 'javascript', 'function binarySearch(arr, target) {\n    let left = 0, right = arr.length - 1;\n    \n    while (left <= right) {\n        const mid = Math.floor((left + right) / 2);\n        if (arr[mid] === target) return mid;\n        if (arr[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    \n    return -1; // Not found\n}', 'Binary search implementation', 'algorithms', ARRAY['binary-search', 'search', 'divide-conquer'], true, 0),

-- Java templates
('Java - Competitive Template', 'java', 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    static BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    static PrintWriter out = new PrintWriter(System.out);\n    \n    public static void main(String[] args) throws IOException {\n        int t = Integer.parseInt(br.readLine().trim());\n        while (t-- > 0) {\n            solve();\n        }\n        out.flush();\n    }\n    \n    static void solve() throws IOException {\n        // Your code here\n    }\n}', 'Fast I/O template for competitive programming', 'competitive', ARRAY['fast-io', 'template'], true, 0),

-- C++ templates
('C++ - Competitive Template', 'cpp', '#include <bits/stdc++.h>\nusing namespace std;\n\n#define ll long long\n#define pb push_back\n#define vi vector<int>\n#define vll vector<ll>\n\nvoid solve() {\n    // Your code here\n}\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    int t = 1;\n    // cin >> t;\n    while (t--) {\n        solve();\n    }\n    \n    return 0;\n}', 'Fast competitive programming template', 'competitive', ARRAY['fast-io', 'template', 'macros'], true, 0)

ON CONFLICT DO NOTHING;

-- =============================================
-- SAMPLE ACHIEVEMENTS
-- =============================================

INSERT INTO achievements (slug, name, description, category, icon, rarity, xp_reward, requirement_type, requirement_value) VALUES
('first-submission', 'First Steps', 'Submit your first solution', 'submissions', '🎯', 'common', 10, 'submissions', 1),
('ten-submissions', 'Getting Started', 'Submit 10 solutions', 'submissions', '📝', 'common', 25, 'submissions', 10),
('fifty-submissions', 'Dedicated Coder', 'Submit 50 solutions', 'submissions', '💻', 'uncommon', 50, 'submissions', 50),
('hundred-submissions', 'Code Machine', 'Submit 100 solutions', 'submissions', '🔥', 'rare', 100, 'submissions', 100),
('first-perfect', 'Perfect Score', 'Get 100% on a submission', 'scores', '⭐', 'common', 20, 'perfect_scores', 1),
('ten-perfect', 'Perfectionist', 'Get 100% on 10 submissions', 'scores', '🌟', 'uncommon', 75, 'perfect_scores', 10),
('first-win', 'Champion', 'Win your first competition', 'competitions', '🏆', 'uncommon', 50, 'wins', 1),
('five-wins', 'Serial Winner', 'Win 5 competitions', 'competitions', '👑', 'rare', 150, 'wins', 5),
('streak-7', 'Week Warrior', 'Maintain a 7-day streak', 'streaks', '🔥', 'uncommon', 50, 'streak', 7),
('streak-30', 'Monthly Master', 'Maintain a 30-day streak', 'streaks', '💪', 'rare', 200, 'streak', 30),
('streak-100', 'Unstoppable', 'Maintain a 100-day streak', 'streaks', '🚀', 'legendary', 500, 'streak', 100),
('first-duel', 'Duelist', 'Complete your first duel', 'duels', '⚔️', 'common', 15, 'duels', 1),
('ten-duel-wins', 'Duel Master', 'Win 10 duels', 'duels', '🗡️', 'uncommon', 100, 'duel_wins', 10),
('all-tutorials', 'Scholar', 'Complete all tutorials', 'tutorials', '📚', 'rare', 150, 'tutorials_completed', 999),
('polyglot', 'Polyglot', 'Submit solutions in 5 different languages', 'languages', '🌍', 'uncommon', 75, 'unique_languages', 5),
('speed-demon', 'Speed Demon', 'Solve a problem in under 60 seconds', 'speed', '⚡', 'rare', 100, 'fast_solve', 1),
('night-owl', 'Night Owl', 'Submit a solution between midnight and 4am', 'special', '🦉', 'uncommon', 30, 'night_submission', 1),
('early-bird', 'Early Bird', 'Be the first to solve a competition problem', 'special', '🐦', 'rare', 100, 'first_solve', 1),
('helpful', 'Helpful', 'Create a competition for others', 'social', '🤝', 'uncommon', 50, 'competitions_created', 1),
('rating-1500', 'Rising Star', 'Reach 1500 skill rating', 'rating', '⬆️', 'uncommon', 75, 'rating', 1500),
('rating-2000', 'Expert', 'Reach 2000 skill rating', 'rating', '🎖️', 'rare', 200, 'rating', 2000),
('rating-2500', 'Grandmaster', 'Reach 2500 skill rating', 'rating', '👑', 'legendary', 500, 'rating', 2500)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
