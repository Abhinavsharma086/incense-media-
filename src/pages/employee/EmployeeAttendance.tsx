import React, { useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getAttendanceRecords, toggleCheckInStatus, AttendanceRecord } from '@/lib/roleAuthStore';
import { CalendarCheck, Clock, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const EmployeeAttendance: React.FC = () => {
  const user = getCurrentUser();
  const adminId = user?.adminId || 'admin-1';
  const employeeId = user?.id || 'emp-1';

  const [records, setRecords] = useState<AttendanceRecord[]>(getAttendanceRecords(adminId, employeeId));
  const [workLog, setWorkLog] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = records.find((r) => r.date === todayStr);

  const handlePunch = () => {
    const updated = toggleCheckInStatus(employeeId, user?.name || 'Employee', adminId, workLog);
    toast.success(todayRecord && !todayRecord.checkOut ? 'Checked Out successfully' : 'Checked In successfully');
    setWorkLog('');
    setRecords(getAttendanceRecords(adminId, employeeId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Attendance & Work Log Tracker</h1>
          <p className="text-sm text-gray-500">Record check-in / check-out times and review past attendance logs.</p>
        </div>
      </div>

      {/* Action Punch Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Date: {todayStr}</span>
          <h2 className="text-xl font-bold text-gray-900">
            {todayRecord
              ? todayRecord.checkOut
                ? 'Daily Shift Completed'
                : `Shift In Progress (Punch in: ${todayRecord.checkIn})`
              : 'Shift Not Started Yet'}
          </h2>
          <p className="text-xs text-gray-500">
            {todayRecord?.workLog ? `Log: ${todayRecord.workLog}` : 'Ensure to submit your daily work notes before checking out.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Today's task / work summary..."
            value={workLog}
            onChange={(e) => setWorkLog(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handlePunch}
            className={`px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md text-white transition-all w-full sm:w-auto ${
              todayRecord && !todayRecord.checkOut ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {todayRecord && !todayRecord.checkOut ? 'Check Out' : 'Check In'}
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-bold text-gray-900 text-base">Attendance History</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4">Work Summary</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 font-semibold text-gray-900">{r.date}</td>
                    <td className="px-6 py-4 text-emerald-600 font-medium">{r.checkIn}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">{r.checkOut || 'Active'}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{r.workLog || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-full border border-emerald-200 uppercase">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendance;
