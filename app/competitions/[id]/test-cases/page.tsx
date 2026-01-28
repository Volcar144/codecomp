"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Loading } from "@/components/ui/Loading";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { 
  Code2, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Edit2
} from "lucide-react";

interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  points: number;
  is_hidden: boolean;
  created_at: string;
}

interface Competition {
  id: string;
  title: string;
  creator_id: string;
}

export default function TestCasesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // New test case form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTestCase, setNewTestCase] = useState({
    input: "",
    expected_output: "",
    points: 10,
    is_hidden: false,
  });
  
  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    input: "",
    expected_output: "",
    points: 10,
    is_hidden: false,
  });

  useEffect(() => {
    if (!isPending) {
      fetchData();
    }
  }, [isPending, params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch competition details
      const compResponse = await fetch(`/api/competitions/${params.id}`);
      if (!compResponse.ok) {
        throw new Error("Competition not found");
      }
      const compData = await compResponse.json();
      setCompetition(compData);

      // Fetch test cases
      const testCasesResponse = await fetch(`/api/competitions/${params.id}/test-cases`);
      if (!testCasesResponse.ok) {
        throw new Error("Failed to fetch test cases");
      }
      const testCasesData = await testCasesResponse.json();
      setTestCases(testCasesData.testCases || []);
      setIsCreator(testCasesData.isCreator);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddTestCase = async () => {
    if (!newTestCase.input.trim() || !newTestCase.expected_output.trim()) {
      setError("Input and expected output are required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/competitions/${params.id}/test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTestCase),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add test case");
      }

      const { testCase } = await response.json();
      setTestCases([...testCases, testCase]);
      setNewTestCase({ input: "", expected_output: "", points: 10, is_hidden: false });
      setShowNewForm(false);
      showSuccess("Test case added successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add test case");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTestCase = async (id: string) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/competitions/${params.id}/test-cases`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update test case");
      }

      const { testCase } = await response.json();
      setTestCases(testCases.map(tc => tc.id === id ? testCase : tc));
      setEditingId(null);
      showSuccess("Test case updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test case");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestCase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        `/api/competitions/${params.id}/test-cases?testCaseId=${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete test case");
      }

      setTestCases(testCases.filter(tc => tc.id !== id));
      showSuccess("Test case deleted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete test case");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (testCase: TestCase) => {
    setEditingId(testCase.id);
    setEditForm({
      input: testCase.input,
      expected_output: testCase.expected_output,
      points: testCase.points,
      is_hidden: testCase.is_hidden,
    });
  };

  if (isPending || loading) {
    return <Loading />;
  }

  if (!session) {
    router.push(`/login?redirect=/competitions/${params.id}/test-cases`);
    return null;
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Only competition creators can manage test cases.
          </p>
          <Link
            href={`/competitions/${params.id}`}
            className="text-blue-600 hover:underline"
          >
            Back to Competition
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CodeComp</span>
          </Link>
          <Link
            href={`/competitions/${params.id}`}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Competition
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Test Cases</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage test cases for{" "}
            <span className="font-semibold">{competition?.title}</span>
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 dark:text-green-200">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Add New Test Case Button */}
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Test Case
          </button>
        )}

        {/* New Test Case Form */}
        {showNewForm && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">New Test Case</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Input</label>
                <textarea
                  value={newTestCase.input}
                  onChange={(e) => setNewTestCase({ ...newTestCase, input: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm"
                  rows={3}
                  placeholder="Enter test input..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected Output</label>
                <textarea
                  value={newTestCase.expected_output}
                  onChange={(e) => setNewTestCase({ ...newTestCase, expected_output: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm"
                  rows={3}
                  placeholder="Enter expected output..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input
                    type="number"
                    value={newTestCase.points}
                    onChange={(e) => setNewTestCase({ ...newTestCase, points: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    min={1}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTestCase.is_hidden}
                      onChange={(e) => setNewTestCase({ ...newTestCase, is_hidden: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">Hidden (not shown to participants)</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddTestCase}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Test Case"}
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Cases List */}
        <div className="space-y-4">
          {testCases.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Test Cases Yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Add test cases to validate participant submissions.
              </p>
            </div>
          ) : (
            testCases.map((testCase, index) => (
              <div
                key={testCase.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
              >
                {editingId === testCase.id ? (
                  // Edit Mode
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Edit Test Case #{index + 1}</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Input</label>
                      <textarea
                        value={editForm.input}
                        onChange={(e) => setEditForm({ ...editForm, input: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Expected Output</label>
                      <textarea
                        value={editForm.expected_output}
                        onChange={(e) => setEditForm({ ...editForm, expected_output: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-sm"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Points</label>
                        <input
                          type="number"
                          value={editForm.points}
                          onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 10 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                          min={1}
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.is_hidden}
                            onChange={(e) => setEditForm({ ...editForm, is_hidden: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm">Hidden</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateTestCase(testCase.id)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">Test Case #{index + 1}</h3>
                        {testCase.is_hidden ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full">
                            <EyeOff className="h-3 w-3" />
                            Hidden
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                            <Eye className="h-3 w-3" />
                            Visible
                          </span>
                        )}
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                          {testCase.points} pts
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditing(testCase)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTestCase(testCase.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Input
                        </label>
                        <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm font-mono overflow-x-auto">
                          {testCase.input || "(empty)"}
                        </pre>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Expected Output
                        </label>
                        <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm font-mono overflow-x-auto">
                          {testCase.expected_output || "(empty)"}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {testCases.length > 0 && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <span className="font-semibold">{testCases.length}</span> test cases •{" "}
                <span className="font-semibold">{testCases.filter(tc => tc.is_hidden).length}</span> hidden •{" "}
                <span className="font-semibold">{testCases.reduce((sum, tc) => sum + tc.points, 0)}</span> total points
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
