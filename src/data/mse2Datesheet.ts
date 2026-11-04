import type { StudentDetails } from "../types/kiet";

export interface ExamSlot {
  date: string; // "YYYY-MM-DD"
  day: string;
  time: string;
  subjectCode: string;
  subjectName: string;
  mode?: string;
}

export interface StudentExamInfo {
  degree: string;
  semester: number;
  branch: string;
  examSlots: ExamSlot[];
  examDates: Set<string>;
  allExcludedDates: Set<string>; // Exam dates + Nov 6 holiday
}

/**
 * Universal holidays/off-days when no classes take place across the entire college.
 */
export const GLOBAL_HOLIDAYS: Record<string, string> = {
  "2026-11-06": "No Classes (College Off)",
};

/**
 * Normalized Exam Schedule for MSE 2 & PUE (Odd Semester 2026-27)
 */
export const MSE2_SCHEDULE_BY_DEGREE_SEM_BRANCH: Record<
  string, // "DEGREE_SEM" e.g. "BTECH_1", "BTECH_3", "BTECH_5", "BTECH_7", "MCA_1", "MBA_1", etc.
  Record<
    string, // Normalized branch key e.g. "CSE", "CS", "ECE", "DEFAULT"
    ExamSlot[]
  >
> = {
  // ---------------------------------------------------------------------------
  // B.TECH I YEAR (I SEMESTER)
  // ---------------------------------------------------------------------------
  BTECH_1: {
    CSE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26PH103BSL", subjectName: "Engineering Physics", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26ME101ESB", subjectName: "Design & Realization", mode: "Activity Based" },
    ],
    CS: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26PH103BSL", subjectName: "Engineering Physics", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26ME101ESB", subjectName: "Design & Realization", mode: "Activity Based" },
    ],
    CSIT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26PH103BSL", subjectName: "Engineering Physics", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26ME101ESB", subjectName: "Design & Realization", mode: "Activity Based" },
    ],
    IT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA201ESL", subjectName: "Discrete Structures & Theory of Logic", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    CSEDS: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26PH103BSL", subjectName: "Engineering Physics", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    CSECS: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA201ESL", subjectName: "Discrete Structures & Theory of Logic", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    CSEAI: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA201ESL", subjectName: "Discrete Structures & Theory of Logic", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    CSEAIML: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT101ESB", subjectName: "Programming for Problem Solving", mode: "Lab/Activity" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26CS101ESB", subjectName: "Digital Logic Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA201ESL", subjectName: "Discrete Structures & Theory of Logic", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    ECE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT102ESB", subjectName: "Logic Building Using C", mode: "Lab" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26PH101BSL", subjectName: "Semiconductor Physics and Devices", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26ME106PCB", subjectName: "Engineering Product Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26EC101PCL", subjectName: "Digital Electronics", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26ME101ESB", subjectName: "Design & Realization", mode: "Activity Based" },
    ],
    ECEVLSI: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT102ESB", subjectName: "Logic Building Using C", mode: "Lab" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26PH101BSL", subjectName: "Semiconductor Physics and Devices", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26ME106PCB", subjectName: "Engineering Product Design", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26EC101PCL", subjectName: "Digital Electronics", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26ME101ESB", subjectName: "Design & Realization", mode: "Activity Based" },
    ],
    ME: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT102ESB", subjectName: "Logic Building Using C", mode: "Lab" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26CH101BSL", subjectName: "Industrial Chemistry", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26ME106PCB", subjectName: "Pneumatics & Automation", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26EE102ESL", subjectName: "Explorations in Electrical Engineering", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    EEE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT102ESB", subjectName: "Logic Building Using C", mode: "Lab" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26CH101BSL", subjectName: "Industrial Chemistry", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26ME106PCB", subjectName: "Pneumatics & Automation", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26EE102ESL", subjectName: "Explorations in Electrical Engineering", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    ELCE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT102ESB", subjectName: "Logic Building Using C", mode: "Lab" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26CH101BSL", subjectName: "Industrial Chemistry", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26ME106PCB", subjectName: "Pneumatics & Automation", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26EE102ESL", subjectName: "Explorations in Electrical Engineering", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
    MEAMIA: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26IT102ESB", subjectName: "Logic Building Using C", mode: "Lab" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26CH101BSL", subjectName: "Industrial Chemistry", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26ME108PCB", subjectName: "Fundamentals of Microsoft Azure", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26EE102ESL", subjectName: "Explorations in Electrical Engineering", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MA101BSL", subjectName: "Calculus for Engineers", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26EE101ESB", subjectName: "Introduction to IoT", mode: "Activity Based" },
    ],
  },

  // ---------------------------------------------------------------------------
  // B.TECH II YEAR (III SEMESTER)
  // ---------------------------------------------------------------------------
  BTECH_3: {
    CSE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "CS205B", subjectName: "Artificial Intelligence and It's Applications", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS206L", subjectName: "Operating System", mode: "Pen-Paper" },
    ],
    CS: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "CS205B", subjectName: "Artificial Intelligence and It's Applications", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS206L", subjectName: "Operating System", mode: "Pen-Paper" },
    ],
    CSEDS: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "CS205B", subjectName: "Artificial Intelligence and It's Applications", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS206L", subjectName: "Operating System", mode: "Pen-Paper" },
    ],
    IT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT107B", subjectName: "Artificial Intelligence Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI103E", subjectName: "Cloud Foundations", mode: "Pen-Paper" },
    ],
    CSECS: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT209B", subjectName: "Cyber Security Techniques & Tools", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI103E", subjectName: "Cloud Foundations", mode: "Pen-Paper" },
    ],
    CSIT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "HS112L", subjectName: "Universal Human Values", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "CS205B", subjectName: "Artificial Intelligence and It's Applications", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS206L", subjectName: "Operating System", mode: "Pen-Paper" },
    ],
    CSAI: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI103E", subjectName: "Cloud Foundations", mode: "Pen-Paper" },
    ],
    CSAIML: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS336B", subjectName: "Object Oriented Programming with Java", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS302B", subjectName: "Advance Data Structure", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI103E", subjectName: "Cloud Foundations", mode: "Pen-Paper" },
    ],
    ECE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EC203B", subjectName: "Basics of Signals and Systems", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI101B", subjectName: "Introduction to AI", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "EC205L", subjectName: "Analog Communication", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EC301L", subjectName: "Microelectronic Circuits", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EC204L", subjectName: "Network Analysis", mode: "Pen-Paper" },
    ],
    ECEVLSI: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EC203B", subjectName: "Basics of Signals and Systems", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI101B", subjectName: "Introduction to AI", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT301L", subjectName: "Database Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "EC223L", subjectName: "Communication Engineering", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EC301L", subjectName: "Microelectronic Circuits", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EC204L", subjectName: "Network Analysis", mode: "Pen-Paper" },
    ],
    ME: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA201L", subjectName: "Statistics, & Numerical Analysis", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "ME201L", subjectName: "Manufacturing Technology - 1", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "ME204L", subjectName: "Engineering Thermodynamics", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "EL106B", subjectName: "Introduction to AI & ML", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "ME203L", subjectName: "Fluid Mechanics & Machinery", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "ME202L", subjectName: "Materials Engineering & Metallurgy", mode: "Pen-Paper" },
    ],
    EEE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "HS112L", subjectName: "Universal Human Values", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EE202L", subjectName: "Electrical Machine-I", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "EE106L", subjectName: "Signals & Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "EL106B", subjectName: "Introduction to AI & ML", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EE108L", subjectName: "Analog Electronics", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EE107L", subjectName: "Electrical Measurements and Data Acquisition", mode: "Pen-Paper" },
    ],
    ELCE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EL201B", subjectName: "Advance Data Structures and Applications", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EL104L", subjectName: "Electrical Machines", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "EL107L", subjectName: "Electric Circuit Analysis", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "EL106B", subjectName: "Introduction to AI & ML", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EL103B", subjectName: "Modern Instrumentation and Data Acquisition", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EL205B", subjectName: "Operating System Concepts", mode: "Pen-Paper" },
    ],
    AMIA: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MA105L", subjectName: "Probability and Statistics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "ME214L", subjectName: "Applied Mechanics", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "ME216B", subjectName: "Pneumatic Systems and PLC Automation", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "EE213L", subjectName: "Electrical Machines and Control", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "ME215L", subjectName: "Manufacturing Processes", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "AI201B", subjectName: "Machine Learning Essentials", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EC233L", subjectName: "Analog and Digital Electronics", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "ME208E", subjectName: "Computer Aided Design", mode: "Pen-Paper" },
    ],
  },

  // ---------------------------------------------------------------------------
  // B.TECH III YEAR (V SEMESTER)
  // ---------------------------------------------------------------------------
  BTECH_5: {
    CSE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS319E", subjectName: "Backend Servers & API Development with Databases", mode: "Activity Based" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS311L", subjectName: "Software Engineering and Design Principles", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "CS312B", subjectName: "Deep Learning & Gen AI", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT401B", subjectName: "Advance Databases", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS310L", subjectName: "Theory of Computation", mode: "Pen-Paper" },
    ],
    CS: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS319E", subjectName: "Backend Servers & API Development with Databases", mode: "Activity Based" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS311L", subjectName: "Software Engineering and Design Principles", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "CS312B", subjectName: "Deep Learning & Gen AI", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT401B", subjectName: "Advance Databases", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS310L", subjectName: "Theory of Computation", mode: "Pen-Paper" },
    ],
    IT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "IT206E", subjectName: "ML Essentials using Python", mode: "Activity Based" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS311L", subjectName: "Software Engineering and Design Principles", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "IT208B", subjectName: "Computer Vision & Digital Image Processing", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT207B", subjectName: "Principles of Quantum Computing", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS310L", subjectName: "Theory of Computation", mode: "Pen-Paper" },
    ],
    CSIT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS319E", subjectName: "Backend Servers & API Development", mode: "Activity Based" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS311L", subjectName: "Software Engineering and Design Principles", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "CS312B", subjectName: "Deep Learning & Gen AI", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT401B", subjectName: "Advance Databases", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS310L", subjectName: "Theory of Computation", mode: "Pen-Paper" },
    ],
    CSAI: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "AI405E", subjectName: "Agentic AI / Cloud Security", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI401B", subjectName: "NLP and Large Language Models", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "AI316B", subjectName: "Software System Engineering and DevOps", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT401B", subjectName: "Advance Databases", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "IT302L", subjectName: "Computer Networks", mode: "Pen-Paper" },
    ],
    CSAIML: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "AI405E", subjectName: "Agentic AI / Cloud Security", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI401B", subjectName: "NLP and Large Language Models", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "AI316B", subjectName: "Software System Engineering and DevOps", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT401B", subjectName: "Advance Databases", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "IT302L", subjectName: "Computer Networks", mode: "Pen-Paper" },
    ],
    ECE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EE305E", subjectName: "Communication Protocols in IIoT Gateways", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI401B", subjectName: "NLP and Large Language Models", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "EC222B", subjectName: "Microprocessor & Microcontroller", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "IT202B", subjectName: "Data Analytics", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EC307L", subjectName: "Antenna & Microwave Engineering", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EC308B", subjectName: "Drone Engineering and Applications", mode: "Activity Based" },
      { date: "2026-11-26", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "EC306L", subjectName: "Digital Signal Processing", mode: "Pen-Paper" },
    ],
    EEE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EL301E", subjectName: "Advanced Metering Infrastructure", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI401B", subjectName: "NLP and Large Language Models", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "EE211L", subjectName: "Analog and Digital Communication", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "EE201B", subjectName: "Machine and Data Analytics", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EE209L", subjectName: "Embedded Controllers and Applications", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EE210L", subjectName: "Power Systems-I", mode: "Pen-Paper" },
    ],
    ELCE: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EL301E", subjectName: "Advanced Metering Infrastructure", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI401B", subjectName: "NLP and Large Language Models", mode: "Activity Based" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "EL303L", subjectName: "Advanced Control and Robotics", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "EL209L", subjectName: "Introduction to Deep Learning", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "EE201B", subjectName: "Machine and Data Analytics", mode: "Activity Based" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "EE209L", subjectName: "Embedded Controllers and Applications", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "EL210L", subjectName: "Digital Signal Processing", mode: "Pen-Paper" },
    ],
    ME: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "ME308E", subjectName: "Piping Design / Automotive Safety", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "AI401B", subjectName: "NLP and Large Language Models", mode: "Activity Based" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "ME221B", subjectName: "AI in Manufacturing Systems", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "ME220L", subjectName: "Industrial Engineering & Operation Research", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "ME305L", subjectName: "Heat & Mass Transfer", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "ME306L", subjectName: "Mechanics of Machines", mode: "Pen-Paper" },
    ],
  },

  // ---------------------------------------------------------------------------
  // B.TECH IV YEAR (VII SEMESTER) - PUE
  // ---------------------------------------------------------------------------
  BTECH_7: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "BCS071", subjectName: "Cloud Computing / Wireless Comm / IoT", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "BCS701", subjectName: "Artificial Intelligence / VLSI / Deep Learning", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "BOE074", subjectName: "Renewable Energy / Project Mgmt / Design Thinking", mode: "Pen-Paper" },
    ],
  },

  // ---------------------------------------------------------------------------
  // MCA I SEMESTER
  // ---------------------------------------------------------------------------
  MCA_1: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "26CA213ESL", subjectName: "Foundation of Mathematics", mode: "Pen-Paper" },
      { date: "2026-11-18", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26CA202PCL", subjectName: "OOP Concepts Using JAVA", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 4:00 PM", subjectCode: "26CA205PCB", subjectName: "Front End Web Development", mode: "Activity Based" },
      { date: "2026-11-20", day: "Wednesday", time: "10:00 AM - 4:00 PM", subjectCode: "26CA204PCL", subjectName: "AI Fundamentals", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "26CA214PCL", subjectName: "Foundation of Computer", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26CA203PCL", subjectName: "Operating System", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26CA201PCL", subjectName: "Software Engineering", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "26MA202ESL", subjectName: "Mathematical Foundation for Computer Applications", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26AS108HSL", subjectName: "Analytical Reasoning & Quantitative Techniques", mode: "Pen-Paper" },
    ],
  },

  // ---------------------------------------------------------------------------
  // MCA III SEMESTER
  // ---------------------------------------------------------------------------
  MCA_3: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CA205L", subjectName: "Analysis & Design of Algorithms", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CA220L", subjectName: "Fundamentals of Machine Learning", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "CA222B", subjectName: "Web Development-II", mode: "Activity Based" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 4:00 PM", subjectCode: "CA212E", subjectName: "Robotic Agentic Automation / Salesforce", mode: "Activity Based" },
    ],
  },

  // ---------------------------------------------------------------------------
  // MBA I SEMESTER
  // ---------------------------------------------------------------------------
  MBA_1: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "26MS504PCL", subjectName: "Accounting for Managers", mode: "Pen-Paper" },
      { date: "2026-11-18", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MS506PCL", subjectName: "Business Concepts and Legislation", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "26MS502PCL", subjectName: "Economics for Managers", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26MS501PCL", subjectName: "Organizational Behaviour", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "26MS503PCL", subjectName: "Business Statistics & Data Analytics", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26MS505PCL", subjectName: "Marketing Management", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "26MS606PEP", subjectName: "Data-driven Analytics / Fintech / SAP", mode: "Laptop / Lab" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "26MS607PEP", subjectName: "Excel Mastery / Digital Lending / SAP", mode: "Laptop / Lab" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26MS507PCL", subjectName: "Design Thinking & Entrepreneurship", mode: "Project Based" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "26MS608PEP", subjectName: "Data Discovery and Predictive Intelligence", mode: "Laptop / Lab" },
    ],
  },

  // ---------------------------------------------------------------------------
  // MBA III SEMESTER
  // ---------------------------------------------------------------------------
  MBA_3: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MS606E", subjectName: "Financial Analytics", mode: "Pen-Paper" },
      { date: "2026-11-18", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "MS607E", subjectName: "Investment Analysis and Portfolio Management", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "MS608E", subjectName: "Financial Derivatives", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "MS611E", subjectName: "Employee Relations & Labour Laws", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "MS612E", subjectName: "HR Analytics", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "MS613E", subjectName: "Compensation Management", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "MS601E", subjectName: "Marketing Analytics", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "MS602E", subjectName: "Sales & Distribution Management", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "MS603E", subjectName: "Service Marketing", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "MS616E", subjectName: "Data Visualization / SCM / Emerging Markets", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "MS617E", subjectName: "Data Mining / Logistics / Export Documentation", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "MS618E", subjectName: "DBMS / Service Operations / Trade Laws", mode: "Pen-Paper" },
    ],
  },

  // ---------------------------------------------------------------------------
  // B.PHARMA (I, III, V, VII)
  // ---------------------------------------------------------------------------
  BPHARMA_1: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "BP104T", subjectName: "Human Anatomy, Physiology I", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "BP102T", subjectName: "General Pharmacy", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "BP103T", subjectName: "Healthcare Psychology and Communication", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "BP101T", subjectName: "Pharmaceutical Inorganic and Analytical Chemistry", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "BP105T", subjectName: "Introduction to Pharmacognosy", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "BP106T", subjectName: "Basics of Python Programming for Pharma", mode: "Pen-Paper" },
    ],
  },
  BPHARMA_3: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "BP301T", subjectName: "Pharmaceutical Organic Chemistry II", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "BP302T", subjectName: "Physical Pharmaceutics I", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "BPH2309", subjectName: "Human Values and Professional Ethics", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "BP304T", subjectName: "Pharmaceutical Engineering", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "BP303T", subjectName: "Pharmaceutical Microbiology", mode: "Pen-Paper" },
    ],
  },
  BPHARMA_5: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "BP501T", subjectName: "Medicinal Chemistry-II", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "BP502T", subjectName: "Industrial Pharmacy-I", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "BP503T", subjectName: "Pharmacology-II", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "10:00 AM - 12:00 PM", subjectCode: "BP504T", subjectName: "Pharmacognosy and Phytochemistry-II", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "BP505T", subjectName: "Pharmaceutical Jurisprudence", mode: "Pen-Paper" },
      { date: "2026-11-26", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "BPH3509T", subjectName: "Drug Regulatory Affairs", mode: "Pen-Paper" },
    ],
  },
  BPHARMA_7: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "BP701T", subjectName: "Instrumental Methods of Analysis", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "BP702T", subjectName: "Industrial Pharmacy II", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "BP703T", subjectName: "Pharmacy Practice", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "BP704T", subjectName: "Novel Drug Delivery System (NDDS)", mode: "Pen-Paper" },
    ],
  },

  // ---------------------------------------------------------------------------
  // M.TECH (I, III)
  // ---------------------------------------------------------------------------
  MTECH_1: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26ML501PCL", subjectName: "Advanced Data Structures / AI Math", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "2:00 PM - 4:00 PM", subjectCode: "26ML502PCB", subjectName: "Machine Learning / AI Foundations", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "2:00 PM - 4:00 PM", subjectCode: "26ML503PCB", subjectName: "Data Engineering / Advanced Software Eng", mode: "Pen-Paper" },
      { date: "2026-11-23", day: "Monday", time: "2:00 PM - 4:00 PM", subjectCode: "26ML504PCB", subjectName: "Programming for AI / Image Processing", mode: "Pen-Paper" },
      { date: "2026-11-25", day: "Wednesday", time: "2:00 PM - 4:00 PM", subjectCode: "26CE505PCB", subjectName: "Advanced Machine Learning & Neural Networks", mode: "Pen-Paper" },
    ],
  },
  MTECH_3: {
    DEFAULT: [
      { date: "2026-11-18", day: "Wednesday", time: "10:00 AM - 12:00 PM", subjectCode: "CS522L", subjectName: "Advanced Computer Architecture", mode: "Pen-Paper" },
      { date: "2026-11-19", day: "Thursday", time: "10:00 AM - 12:00 PM", subjectCode: "CS519E", subjectName: "Network Security and Cryptography", mode: "Pen-Paper" },
      { date: "2026-11-20", day: "Friday", time: "10:00 AM - 12:00 PM", subjectCode: "CS520E", subjectName: "Wireless Sensor Networks", mode: "Pen-Paper" },
    ],
  },
};

/**
 * Normalizes degree string (e.g. "Bachelor of Technology", "B.Tech", "MCA")
 */
export function normalizeDegree(degreeRaw?: string | null): string {
  const d = (degreeRaw || "").toUpperCase();
  if (d.includes("MCA")) return "MCA";
  if (d.includes("MBA")) return "MBA";
  if (d.includes("M.TECH") || d.includes("MTECH") || d.includes("MASTER OF TECHNOLOGY")) return "MTECH";
  if (d.includes("PHARM") && d.includes("M")) return "MPHARM";
  if (d.includes("PHARM")) return "BPHARMA";
  return "BTECH"; // Default to B.Tech
}

/**
 * Normalizes semester string into numeric semester (1, 3, 5, 7)
 */
export function normalizeSemester(semRaw?: string | null): number {
  const s = (semRaw || "").toUpperCase();
  if (s.includes("VII") || s.includes("7")) return 7;
  if (s.includes("V") || s.includes("5")) return 5;
  if (s.includes("III") || s.includes("3")) return 3;
  if (s.includes("I") || s.includes("1")) return 1;
  return 1;
}

/**
 * Normalizes branch string into clean alphanumeric code (e.g. "CSE-AIML" -> "CSEAIML")
 */
export function normalizeBranch(branchRaw?: string | null): string {
  const b = (branchRaw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (b.includes("AIML") || (b.includes("AI") && b.includes("ML"))) {
    return b.startsWith("CS") ? "CSEAIML" : "CSEAIML";
  }
  if (b.includes("CSAI") || (b.includes("CS") && b.includes("AI"))) {
    return "CSAI";
  }
  if (b.includes("CSDS") || (b.includes("CS") && b.includes("DS"))) {
    return "CSEDS";
  }
  if (b.includes("CSCS") || (b.includes("CS") && b.includes("CYBER"))) {
    return "CSECS";
  }
  if (b.includes("CSIT")) return "CSIT";
  if (b.includes("CSE")) return "CSE";
  if (b.includes("CS")) return "CS";
  if (b.includes("IT")) return "IT";
  if (b.includes("VLSI")) return "ECEVLSI";
  if (b.includes("ECE")) return "ECE";
  if (b.includes("EEE")) return "EEE";
  if (b.includes("ELCE")) return "ELCE";
  if (b.includes("AMIA")) return "AMIA";
  if (b.includes("ME")) return "ME";
  return b;
}

/**
 * Resolves the student's exact exam slots and excluded dates based on StudentDetails.
 */
export function getStudentExamSchedule(student?: StudentDetails | null): StudentExamInfo {
  const degree = normalizeDegree(student?.degreeName);
  const semester = normalizeSemester(student?.semesterName);
  const branch = normalizeBranch(student?.branchShortName);

  const degreeSemKey = `${degree}_${semester}`;
  const degreeSemGroup = MSE2_SCHEDULE_BY_DEGREE_SEM_BRANCH[degreeSemKey];

  let matchedSlots: ExamSlot[] = [];

  if (degreeSemGroup) {
    if (degreeSemGroup[branch]) {
      matchedSlots = degreeSemGroup[branch];
    } else if (degreeSemGroup["DEFAULT"]) {
      matchedSlots = degreeSemGroup["DEFAULT"];
    } else {
      // Fallback: match by course codes in student's registered subjects
      const registeredCodes = (student?.attendanceCourseComponentInfoList || []).map((c) =>
        c.courseCode.toUpperCase().replace(/[^A-Z0-9]/g, "")
      );

      for (const branchKey of Object.keys(degreeSemGroup)) {
        const slots = degreeSemGroup[branchKey];
        const matchCount = slots.filter((slot) => {
          const sCode = slot.subjectCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
          return registeredCodes.some((rc) => rc === sCode || rc.includes(sCode) || sCode.includes(rc));
        }).length;

        if (matchCount > 0) {
          matchedSlots = slots;
          break;
        }
      }

      // If still no branch-specific match found, use first branch slots as conservative template
      if (matchedSlots.length === 0) {
        const firstBranch = Object.keys(degreeSemGroup)[0];
        matchedSlots = degreeSemGroup[firstBranch] || [];
      }
    }
  }

  const examDates = new Set<string>();
  const allExcludedDates = new Set<string>(Object.keys(GLOBAL_HOLIDAYS));

  for (const slot of matchedSlots) {
    examDates.add(slot.date);
    allExcludedDates.add(slot.date);
  }

  return {
    degree,
    semester,
    branch,
    examSlots: matchedSlots,
    examDates,
    allExcludedDates,
  };
}
