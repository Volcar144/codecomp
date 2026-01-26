import Link from "next/link";
import { Code2, BookOpen, Zap, Trophy, Shield, Users } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Home
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <BookOpen className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold mb-4">Documentation</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Everything you need to know about using CodeComp
          </p>
        </div>

        <div className="space-y-12">
          {/* Getting Started */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl font-bold">Getting Started</h2>
            </div>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                CodeComp is a platform for creating and participating in coding competitions.
                Here's how to get started:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Create an account or sign in</li>
                <li>Browse available competitions</li>
                <li>Read the competition rules and requirements</li>
                <li>Write your code in the built-in editor</li>
                <li>Test your solution with sample test cases</li>
                <li>Submit your solution when ready</li>
                <li>Check the leaderboard to see your ranking</li>
              </ol>
            </div>
          </section>

          {/* Creating Competitions */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-purple-600" />
              <h2 className="text-3xl font-bold">Creating Competitions</h2>
            </div>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Anyone can create a competition! Here's what you need to do:</p>
              <div className="space-y-3">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-1">1. Basic Information</h3>
                  <p>Provide a title, description, and rules for your competition.</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-1">2. Set Dates</h3>
                  <p>Choose when your competition starts and ends.</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-1">3. Choose Languages</h3>
                  <p>Select which programming languages participants can use.</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-1">4. Define Test Cases</h3>
                  <p>Create test cases to validate submissions (via API or database).</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold mb-1">5. Set Prizes (Optional)</h3>
                  <p>Define prizes for top performers to attract more participants.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Supported Languages */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Code2 className="h-8 w-8 text-green-600" />
              <h2 className="text-3xl font-bold">Supported Languages</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Python</h3>
                <p className="text-sm">Popular for algorithms and data science</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">JavaScript</h3>
                <p className="text-sm">Great for web development challenges</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Java</h3>
                <p className="text-sm">Enterprise-grade solutions</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">C++</h3>
                <p className="text-sm">High-performance computing</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">C#</h3>
                <p className="text-sm">.NET and game development</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Go</h3>
                <p className="text-sm">Modern systems programming</p>
              </div>
            </div>
          </section>

          {/* Scoring & Rankings */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <h2 className="text-3xl font-bold">Scoring & Rankings</h2>
            </div>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Your ranking is determined by:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Score:</strong> Percentage of test cases passed (higher is better)
                </li>
                <li>
                  <strong>Execution Time:</strong> Faster solutions rank higher for tied scores
                </li>
                <li>
                  <strong>Submission Time:</strong> Earlier submissions may receive bonus points
                </li>
              </ul>
              <p className="mt-4">
                You can submit multiple times, and your best score will be counted on the
                leaderboard.
              </p>
            </div>
          </section>

          {/* Judges & Moderation */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-indigo-600" />
              <h2 className="text-3xl font-bold">Judges & Moderation</h2>
            </div>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Competition creators can assign judges to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Review submissions for quality and correctness</li>
                <li>Manage test cases and competition settings</li>
                <li>Resolve disputes and answer participant questions</li>
                <li>Award bonus points for exceptional solutions</li>
              </ul>
            </div>
          </section>

          {/* Code Execution */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-red-600" />
              <h2 className="text-3xl font-bold">Code Execution & Security</h2>
            </div>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>Your code is executed in a secure, sandboxed environment:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Limited execution time (typically 2-5 seconds per test case)</li>
                <li>Memory limits to prevent resource exhaustion</li>
                <li>No network access or file system operations</li>
                <li>Isolated containers for each execution</li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-sm">
                  <strong>Note:</strong> The current implementation uses mock code execution.
                  For production, integrate with Judge0, Piston, or a custom execution engine.
                </p>
              </div>
            </div>
          </section>

          {/* Tips & Best Practices */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-8 w-8 text-orange-600" />
              <h2 className="text-3xl font-bold">Tips & Best Practices</h2>
            </div>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <div>
                    <strong>Test thoroughly:</strong> Use the "Run Tests" button before
                    submitting
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <div>
                    <strong>Optimize for speed:</strong> Faster solutions rank higher
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <div>
                    <strong>Handle edge cases:</strong> Consider empty inputs, large numbers,
                    etc.
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <div>
                    <strong>Read the rules:</strong> Each competition may have specific
                    requirements
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 dark:text-blue-400">•</span>
                  <div>
                    <strong>Submit early, submit often:</strong> You can always improve your
                    solution
                  </div>
                </li>
              </ul>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/competitions"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-semibold"
          >
            Start Competing
          </Link>
        </div>
      </main>
    </div>
  );
}
