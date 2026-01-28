"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { InviteCodeCard } from "@/components/InviteCodeCard";

interface CompetitionManagementProps {
  competitionId: string;
  isPublic: boolean;
  inviteCode: string | null;
  testCaseCount: number;
}

export function CompetitionManagement({
  competitionId,
  isPublic,
  inviteCode,
  testCaseCount,
}: CompetitionManagementProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5" />
        Competition Management
      </h2>
      
      {/* Invite Code Section for Private Competitions */}
      {!isPublic && inviteCode && (
        <div className="mb-4">
          <InviteCodeCard
            inviteCode={inviteCode}
            entityId={competitionId}
            entityType="competition"
          />
        </div>
      )}
      
      <div className="space-y-3">
        <Link
          href={`/competitions/${competitionId}/test-cases`}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          <div>
            <div className="font-medium">Test Cases</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {testCaseCount} test cases configured
            </div>
          </div>
          <span className="text-blue-600">Manage →</span>
        </Link>
      </div>
    </div>
  );
}
