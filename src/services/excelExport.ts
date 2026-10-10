import * as XLSX from 'xlsx';
import { storage } from './storage';
import { DailyClassAttendance, DailyStaffAttendance } from '../types';

export interface StudentReportFilter {
  year: number;
  month: number; // 1 - 12
  classId: string;
  section?: string;
  studentId?: string;
}

export interface StaffReportFilter {
  year: number;
  month: number;
  staffId?: string;
}

function getDatesInMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    dates.push(`${year}-${monthStr}-${dayStr}`);
  }
  return dates;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function exportStudentAttendanceExcel(filter: StudentReportFilter): { success: boolean; filename: string; error?: string } {
  try {
    const school = storage.getSchool();
    const classes = storage.getClasses();
    const targetClass = classes.find(c => c.id === filter.classId);
    if (!targetClass) {
      return { success: false, filename: '', error: 'Class not found.' };
    }

    const today = storage.getTodayInKolkata();
    let students = (filter.section && filter.section !== 'all')
      ? storage.getStudentsByClassAndSection(filter.classId, filter.section)
      : storage.getStudentsByClass(filter.classId);

    if (filter.studentId && filter.studentId !== 'all') {
      students = students.filter(s => s.id === filter.studentId);
    }

    if (students.length === 0) {
      return { success: false, filename: '', error: 'No active students found matching the selected criteria.' };
    }

    students.sort((a, b) => parseInt(a.rollNo, 10) - parseInt(b.rollNo, 10));

    const monthDates = getDatesInMonth(filter.year, filter.month);
    const monthName = MONTH_NAMES[filter.month - 1];

    const dayMeta = monthDates.map(dateStr => {
      const check = storage.isSchoolDay(dateStr);
      const dayNum = parseInt(dateStr.split('-')[2], 10);
      return {
        dateStr,
        dayNum,
        isWorkingDay: check.isWorkingDay,
        reason: check.reason,
      };
    });

    const applicablePastWorkingDays = dayMeta.filter(d => d.isWorkingDay && d.dateStr <= today).length;

    const allAttendance = storage.getAllStudentAttendance().filter(
      a => a.classId === filter.classId &&
           (!filter.section || filter.section === 'all' || a.section === filter.section) &&
           a.date.startsWith(`${filter.year}-${filter.month < 10 ? '0' + filter.month : filter.month}`)
    );

    const attendanceMap = new Map<string, DailyClassAttendance>();
    allAttendance.forEach(a => {
      attendanceMap.set(a.date, a);
    });

    const aoa: any[][] = [];
    const secDescription = filter.section && filter.section !== 'all'
      ? `Section ${filter.section}`
      : (targetClass.sections && targetClass.sections.length > 0
          ? `Sections: ${targetClass.sections.join(', ')}`
          : 'Single Batch');

    aoa.push([`${school.name.toUpperCase()} - OFFICIAL STUDENT ATTENDANCE REGISTER`]);
    aoa.push([`Class: ${targetClass.name} (${secDescription})`, '', `Academic Month: ${monthName} ${filter.year}`, '', `Working Days to Date: ${applicablePastWorkingDays}`]);
    aoa.push([`School Campus: ${school.address || ''}`, '', `Generated on: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`]);
    aoa.push([]);

    const headerRow: string[] = ['Student ID', 'Roll No', 'Student Name', 'Class', 'Section'];
    dayMeta.forEach(d => {
      headerRow.push(`${d.dayNum}`);
    });
    headerRow.push('Present Days', 'Absent Days', 'Leave Days', 'Working Days', 'Attendance %');
    aoa.push(headerRow);

    students.forEach(student => {
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      const row: any[] = [
        student.id,
        student.rollNo,
        student.fullName,
        targetClass.name,
        student.section || targetClass.section || '-',
      ];

      dayMeta.forEach(d => {
        if (d.dateStr > today) {
          row.push('');
          return;
        }
        if (!d.isWorkingDay) {
          row.push('H');
          return;
        }
        const dailyAttendance = attendanceMap.get(d.dateStr);
        if (!dailyAttendance) {
          row.push('-');
          return;
        }
        const studentRec = dailyAttendance.records.find(r => r.studentId === student.id);
        const recStatus = studentRec?.status as string | undefined;
        if (!studentRec || recStatus === 'not_marked') {
          row.push('-');
          return;
        }
        if (studentRec.status === 'present') {
          presentDays++;
          row.push('P');
        } else if (studentRec.status === 'absent') {
          absentDays++;
          row.push('A');
        } else if (studentRec.status === 'leave') {
          leaveDays++;
          row.push('L');
        } else {
          row.push('-');
        }
      });

      const percentage = applicablePastWorkingDays > 0
        ? ((presentDays / applicablePastWorkingDays) * 100).toFixed(1) + '%'
        : '0.0%';
      row.push(presentDays, absentDays, leaveDays, applicablePastWorkingDays, percentage);
      aoa.push(row);
    });

    aoa.push([]);
    aoa.push(['Legend:', 'P = Present', 'A = Absent', 'L = Approved Leave', 'H = Holiday/Off', '- = Not Marked / Pending', '(Blank) = Future Date']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths: { wch: number }[] = [
      { wch: 16 },
      { wch: 10 },
      { wch: 24 },
      { wch: 14 },
      { wch: 10 },
    ];
    dayMeta.forEach(() => {
      colWidths.push({ wch: 5 });
    });
    colWidths.push({ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 15 });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = `${targetClass.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}_${monthName.substring(0, 3)}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const secSuffix = filter.section && filter.section !== 'all' ? `_Sec_${filter.section}` : '';
    const filename = `Attendance_${targetClass.name.replace(/\s+/g, '_')}${secSuffix}_${monthName}_${filter.year}.xlsx`;
    XLSX.writeFile(wb, filename);

    return { success: true, filename };
  } catch (err: any) {
    console.error('Error generating student attendance Excel:', err);
    return { success: false, filename: '', error: err?.message || 'Failed to generate Excel file.' };
  }
}

export function exportStaffAttendanceExcel(filter: StaffReportFilter): { success: boolean; filename: string; error?: string } {
  try {
    const school = storage.getSchool();
    let staffMembers = storage.getStaffMembers();
    if (filter.staffId && filter.staffId !== 'all') {
      staffMembers = staffMembers.filter(s => s.id === filter.staffId);
    }

    if (staffMembers.length === 0) {
      return { success: false, filename: '', error: 'No staff members found.' };
    }

    const monthDates = getDatesInMonth(filter.year, filter.month);
    const monthName = MONTH_NAMES[filter.month - 1];

    const dayMeta = monthDates.map(dateStr => {
      const check = storage.isSchoolDay(dateStr);
      const dayNum = parseInt(dateStr.split('-')[2], 10);
      return {
        dateStr,
        dayNum,
        isWorkingDay: check.isWorkingDay,
        reason: check.reason,
      };
    });

    const today = storage.getTodayInKolkata();
    const applicablePastWorkingDays = dayMeta.filter(d => d.isWorkingDay && d.dateStr <= today).length;
    const monthPrefix = `${filter.year}-${filter.month < 10 ? '0' + filter.month : filter.month}`;
    const allStaffAtt = storage.getAllStaffAttendance().filter(a => a.date.startsWith(monthPrefix));

    const staffAttMap = new Map<string, DailyStaffAttendance>();
    allStaffAtt.forEach(a => {
      staffAttMap.set(a.date, a);
    });

    const aoa: any[][] = [];
    aoa.push([`${school.name.toUpperCase()} - OFFICIAL FACULTY ATTENDANCE REGISTER`]);
    aoa.push([`Month: ${monthName} ${filter.year}`, '', `Working Days to Date: ${applicablePastWorkingDays}`, '', `Staff Count: ${staffMembers.length}`]);
    aoa.push([`School Campus: ${school.address || ''}`, '', `Generated on: ${new Date().toLocaleDateString('en-GB')} by Principal's Office`]);
    aoa.push([]);

    const headerRow: string[] = ['Staff UID', 'Teacher Name', 'Designation', 'Mobile'];
    dayMeta.forEach(d => {
      headerRow.push(`${d.dayNum}`);
    });
    headerRow.push('Present', 'Absent', 'On Leave', 'Working Days', 'Attendance %');
    aoa.push(headerRow);

    staffMembers.forEach(staff => {
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      const row: any[] = [
        staff.uid,
        staff.fullName,
        staff.designation || 'Teacher',
        staff.mobile,
      ];

      dayMeta.forEach(d => {
        if (d.dateStr > today) {
          row.push('');
          return;
        }
        if (!d.isWorkingDay) {
          row.push('H');
          return;
        }
        const dailyStaffRecord = staffAttMap.get(d.dateStr);
        if (!dailyStaffRecord) {
          row.push('-');
          return;
        }
        const staffRec = dailyStaffRecord.records.find(r => r.staffId === staff.id);
        if (!staffRec) {
          row.push('-');
          return;
        }
        if (staffRec.status === 'present') {
          presentCount++;
          row.push('P');
        } else if (staffRec.status === 'absent') {
          absentCount++;
          row.push('A');
        } else if (staffRec.status === 'on_leave') {
          leaveCount++;
          row.push('L');
        } else {
          row.push('-');
        }
      });

      const percentage = applicablePastWorkingDays > 0
        ? ((presentCount / applicablePastWorkingDays) * 100).toFixed(1) + '%'
        : '0.0%';
      row.push(presentCount, absentCount, leaveCount, applicablePastWorkingDays, percentage);
      aoa.push(row);
    });

    aoa.push([]);
    aoa.push(['Legend:', 'P = Present', 'A = Absent', 'L = On Leave', 'H = Holiday/Weekly Off', '- = Not Marked', '(Blank) = Future Date']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths: { wch: number }[] = [
      { wch: 12 },
      { wch: 22 },
      { wch: 24 },
      { wch: 14 },
    ];
    dayMeta.forEach(() => {
      colWidths.push({ wch: 5 });
    });
    colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Staff_${monthName.substring(0, 3)}`);

    const filename = `Staff_Attendance_Report_${monthName}_${filter.year}.xlsx`;
    XLSX.writeFile(wb, filename);

    return { success: true, filename };
  } catch (err: any) {
    console.error('Error generating staff attendance Excel:', err);
    return { success: false, filename: '', error: err?.message || 'Failed to generate Excel file.' };
  }
}
