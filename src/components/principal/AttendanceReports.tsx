import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import {
  exportStudentAttendanceExcel,
  exportStaffAttendanceExcel
} from '../../services/excelExport';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Filter
} from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const AttendanceReports: React.FC = () => {
  const [classes, setClasses] = useState(() => storage.getClasses());
  const [staffMembers, setStaffMembers] = useState(() => storage.getStaffMembers());
  const [reportType, setReportType] = useState<'student' | 'staff'>('student');

  const todayDateStr = storage.getTodayInKolkata();
  const [currentYearStr, currentMonthStr] = todayDateStr.split('-');
  const currentYear = parseInt(currentYearStr, 10);
  const currentMonth = parseInt(currentMonthStr, 10);
  const availableYears = [currentYear - 1, currentYear, currentYear + 1];

  // Student filter
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('all');

  // Staff filter
  const [staffYear, setStaffYear] = useState(currentYear);
  const [staffMonth, setStaffMonth] = useState(currentMonth);
  const [selectedStaffId, setSelectedStaffId] = useState('all');

  const [downloadSuccess, setDownloadSuccess] = useState('');
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setClasses(storage.getClasses());
      setStaffMembers(storage.getStaffMembers());
    });
    return unsub;
  }, []);

  const handleExportStudentExcel = () => {
    setDownloadSuccess('');
    setDownloadError('');
    const res = exportStudentAttendanceExcel({
      year: selectedYear,
      month: selectedMonth,
      classId: selectedClassId,
      section: selectedSection !== 'all' ? selectedSection : undefined,
      studentId: selectedStudentId,
    });
    if (res.success) {
      setDownloadSuccess(`Official register spreadsheet created: ${res.filename}`);
      setTimeout(() => setDownloadSuccess(''), 4000);
    } else {
      setDownloadError(res.error || 'Failed to generate Excel file.');
    }
  };

  const handleExportStaffExcel = () => {
    setDownloadSuccess('');
    setDownloadError('');
    const res = exportStaffAttendanceExcel({
      year: staffYear,
      month: staffMonth,
      staffId: selectedStaffId,
    });
    if (res.success) {
      setDownloadSuccess(`Official faculty spreadsheet created: ${res.filename}`);
      setTimeout(() => setDownloadSuccess(''), 4000);
    } else {
      setDownloadError(res.error || 'Failed to generate Excel file.');
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentSections = currentClass?.sections && currentClass.sections.length > 0
    ? currentClass.sections
    : (currentClass?.section ? [currentClass.section] : []);

  const studentsInClass = currentClass
    ? storage.getStudentsByClassAndSection(currentClass.id, selectedSection !== 'all' ? selectedSection : undefined)
    : [];

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const previewDates: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = i < 10 ? `0${i}` : `${i}`;
    const mStr = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    previewDates.push(`${selectedYear}-${mStr}-${dStr}`);
  }

  const monthAttendance = storage.getAllStudentAttendance().filter(
    (a) => a.classId === selectedClassId &&
           (!selectedSection || selectedSection === 'all' || a.section === selectedSection) &&
           a.date.startsWith(`${selectedYear}-${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}`)
  );

  const workingDays = previewDates.filter(d => storage.isSchoolDay(d).isWorkingDay && d <= todayDateStr).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Attendance Reports & Excel Registers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate monthly registers and downloadable Microsoft Excel (.xlsx) files
          </p>
        </div>
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setReportType('student')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
              reportType === 'student'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Student Register
          </button>
          <button
            type="button"
            onClick={() => setReportType('staff')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
              reportType === 'staff'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Teacher Register
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}
      {downloadError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Student Report Section */}
      {reportType === 'student' && (
        classes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              No Classes Configured Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Please configure classes in <strong>Classes & Sections</strong> to generate student attendance Excel reports.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>Report Criteria</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600 font-semibold"
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600 font-semibold"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedSection('all');
                      setSelectedStudentId('all');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600 font-semibold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Section
                  </label>
                  {currentSections.length > 0 ? (
                    <select
                      value={selectedSection}
                      onChange={(e) => {
                        setSelectedSection(e.target.value);
                        setSelectedStudentId('all');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600 font-semibold"
                    >
                      <option value="all">All Sections ({currentSections.join(', ')})</option>
                      {currentSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Single Batch"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-400 bg-slate-50 italic outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Student
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600"
                  >
                    <option value="all">All Students ({studentsInClass.length})</option>
                    {studentsInClass.map((s) => (
                      <option key={s.id} value={s.id}>
                        Roll {s.rollNo} - {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Download Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/30 flex-shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-white">
                    Download Official Student .xlsx Register
                  </p>
                  <p className="text-xs text-emerald-200 font-mono">
                    Attendance_{currentClass?.name?.replace(/\s+/g, '_')}_{MONTHS[selectedMonth - 1].label}_{selectedYear}.xlsx
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Includes calendar working day metrics, holiday exclusions, and official signatures
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportStudentExcel}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <Download className="w-4 h-4" />
                <span>Download Register</span>
              </button>
            </div>

            {/* Preview Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Preview: {currentClass?.name} &bull; {MONTHS[selectedMonth - 1].label} {selectedYear}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({workingDays} School Days to date)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> P = Present
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> A = Absent
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> L = Leave
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> - = Not Marked
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-purple-700">
                    <span className="w-2 h-2 rounded-full bg-purple-500" /> H = Off
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-white shadow-sm z-20">
                    <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-30">Roll</th>
                      <th className="py-2.5 px-3 sticky left-14 bg-slate-50 z-30">Student Name</th>
                      {previewDates.slice(0, 15).map((d) => (
                        <th key={d} className="py-2.5 px-1.5 text-center w-8">
                          {parseInt(d.split('-')[2], 10)}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 text-center">Present</th>
                      <th className="py-2.5 px-3 text-center">Absent</th>
                      <th className="py-2.5 px-3 text-center">Leave</th>
                      <th className="py-2.5 px-3 text-center">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentsInClass.length === 0 ? (
                      <tr>
                        <td colSpan={previewDates.slice(0, 15).length + 6} className="py-10 text-center text-slate-400 text-xs">
                          No students found in this class/section. Enroll students in Student Directory first.
                        </td>
                      </tr>
                    ) : (
                      studentsInClass.map((student) => {
                      let presentCount = 0;
                      let absentCount = 0;
                      let leaveCount = 0;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-900 sticky left-0 bg-white z-10">
                            {student.rollNo}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap sticky left-14 bg-white z-10">
                            {student.fullName}
                          </td>
                          {previewDates.slice(0, 15).map((d) => {
                            if (d > todayDateStr) {
                              return (
                                <td key={d} className="py-2.5 px-1.5 text-center text-slate-300 italic text-[10px]">
                                  -
                                </td>
                              );
                            }
                            const isSchoolDay = storage.isSchoolDay(d).isWorkingDay;
                            if (!isSchoolDay) {
                              return (
                                <td key={d} className="py-2.5 px-1.5 text-center text-purple-600 bg-purple-50/30 font-bold text-[10px]">
                                  H
                                </td>
                              );
                            }
                            const daily = monthAttendance.find(a => a.date === d);
                            const stRec = daily?.records.find(r => r.studentId === student.id);
                            const stStatus = stRec?.status as string | undefined;
                            if (!stRec || stStatus === 'not_marked') {
                              return (
                                <td key={d} className="py-2.5 px-1.5 text-center text-slate-400 font-medium">
                                  -
                                </td>
                              );
                            }
                            if (stRec.status === 'present') {
                              presentCount++;
                              return (
                                <td key={d} className="py-2.5 px-1.5 text-center text-emerald-600 font-bold">
                                  P
                                </td>
                              );
                            }
                            if (stRec.status === 'leave') {
                              leaveCount++;
                              return (
                                <td key={d} className="py-2.5 px-1.5 text-center text-amber-600 font-bold">
                                  L
                                </td>
                              );
                            }
                            absentCount++;
                            return (
                              <td key={d} className="py-2.5 px-1.5 text-center text-rose-600 font-bold">
                                A
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                            {presentCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-rose-700">
                            {absentCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                            {leaveCount}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-900">
                            {workingDays > 0 ? `${((presentCount / workingDays) * 100).toFixed(0)}%` : '0%'}
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* Staff Report Section */}
      {reportType === 'staff' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Teacher Report Criteria</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Academic Year
                </label>
                <select
                  value={staffYear}
                  onChange={(e) => setStaffYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600 font-semibold"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Month
                </label>
                <select
                  value={staffMonth}
                  onChange={(e) => setStaffMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600 font-semibold"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Faculty Member
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:border-indigo-600"
                >
                  <option value="all">All Faculty ({staffMembers.length})</option>
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} (UID: {s.uid})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-400/30 flex-shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-white">
                  Download Faculty Monthly Report (.xlsx)
                </p>
                <p className="text-xs text-purple-200 font-mono">
                  Staff_Attendance_Report_{MONTHS[staffMonth - 1].label}_{staffYear}.xlsx
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Complete faculty presence, leave records, working days, and percentages
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportStaffExcel}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Download className="w-4 h-4" />
              <span>Download Staff Excel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
