// Transcribed from "ARCHILANCE LLC – Leave & Time-Off Policy" (effective 1 Aug
// 2026) and its BIM Team addendum. Kept as structured data rather than raw
// PDFs so it renders responsively and can be filtered per team — see
// PoliciesPage.jsx for how GENERAL_SECTIONS and TEAM_ADDENDA are combined.
//
// Block types rendered by PoliciesPage:
//   p           — a paragraph
//   subheading  — a small bold sub-title within a section
//   list        — a bullet list
//   callout     — an emphasized/boxed notice (the ALL-CAPS lines in the PDF)
//   stat        — a short bold standalone line (e.g. a totals summary)
//   example     — a monospace worked example

export const POLICY_META = {
  title: "Archilance LLC Leave & Time-Off Policy",
  subtitle: "A Balanced, Transparent & Remote-Friendly Leave Framework",
  effectiveDate: "1 August 2026",
  owner: "HR Manager – Laraib Ijaz",
};

export const GENERAL_SECTIONS = [
  {
    id: "purpose",
    title: "Purpose of This Policy",
    blocks: [
      { type: "p", text: "The purpose of this Leave & Time-Off Policy is to create a clear, fair, flexible, and transparent system for managing employee leave." },
      { type: "p", text: "The company recognizes that employees need time away from work for rest, personal commitments, health, family responsibilities, emergencies, and important life events." },
      { type: "p", text: "At the same time, a remote team requires sufficient planning and communication to ensure that leave does not negatively affect clients, deadlines, projects, or other team members." },
      { type: "p", text: "This policy is therefore built around four principles:" },
      { type: "stat", text: "PLAN — COMMUNICATE — COVER — REST" },
      { type: "p", text: "Employees should be able to take their entitled leave without unnecessary difficulty, while teams should have reasonable visibility and coverage." },
      { type: "p", text: "The policy is not intended to discourage employees from taking leave. It is intended to ensure that leave is planned where possible, communicated clearly, approved fairly, and managed responsibly." },
    ],
  },
  {
    id: "entitlement",
    title: "Leave Entitlement",
    blocks: [
      { type: "p", text: "Each employee's leave year begins on their date of joining and runs 12 months from that date. Leave entitlements are calculated and administered based on this individual leave year." },
      { type: "p", text: "All employees are entitled to a total of 28 leave days per year, divided into three categories:" },
      {
        type: "list",
        items: [
          "Annual Leave – 10 Days: planned rest, vacations, travel, personal time, family events, and other planned periods away from work.",
          "Casual Leave – 10 Days: short-term personal matters, appointments, urgent commitments, family responsibilities, personal errands, or unexpected situations.",
          "Sick Leave – 8 Days: illness, medical recovery, medical appointments, medical procedures, injuries, or other genuine health-related needs.",
        ],
      },
      { type: "p", text: "Marriage Leave – 15 Paid Days: employees are entitled to 15 paid Marriage Leave days for their own marriage. These 15 days are a separate entitlement and are not deducted from the Annual, Casual, or Sick Leave balance. Any additional days beyond the 15 paid days are treated as unpaid leave." },
      { type: "callout", text: "EMPLOYEES MAY CHOOSE TO TAKE MORE THAN 15 DAYS FOR THEIR MARRIAGE; HOWEVER, ONLY THE FIRST 15 DAYS WILL BE PAID, AND ANY ADDITIONAL DAYS WILL BE UNPAID." },
      { type: "stat", text: "Total Standard Annual Entitlement: 28 Leave Days + 15 Marriage Leaves" },
      { type: "p", text: "These categories are separate and should not be treated interchangeably." },
    ],
  },
  {
    id: "annual",
    title: "1. Annual Leave — 10 Days",
    blocks: [
      { type: "subheading", text: "Purpose" },
      { type: "p", text: "Each employee is entitled to 10 Annual Leave days per leave year. Annual Leave is intended for planned time away from work, including:" },
      { type: "list", items: ["Vacation and travel", "Family holidays and planned events", "Weddings and celebrations", "Personal commitments or projects", "Rest, relaxation, and recovery", "Any other planned personal purpose"] },
      { type: "p", text: "Employees are not required to disclose private personal details when requesting Annual Leave." },
      { type: "subheading", text: "Eligibility & Notice" },
      { type: "callout", text: "Annual Leave can only be used after successful completion of the employee's probation period. Employees on probation are not eligible to take Annual Leave." },
      { type: "p", text: "Annual Leave must normally be requested at least 1 week in advance. For longer periods, employees are encouraged to provide additional notice whenever possible." },
      { type: "p", text: "In genuine urgent circumstances, management may approve Annual Leave with shorter notice on a case-by-case basis." },
      { type: "subheading", text: "Weekends Are Included in Annual Leave" },
      { type: "callout", text: "SATURDAY AND SUNDAY WILL BE COUNTED AS ANNUAL LEAVE WHEN THEY FALL WITHIN THE CONTINUOUS PERIOD OF LEAVE." },
      { type: "p", text: "Employees cannot use weekends to extend their Annual Leave period without deducting them from their leave balance. Employees should consider weekends when planning their Annual Leave." },
      { type: "example", lines: ["Monday to Sunday = 7 Annual Leave days", "Friday to Monday = 4 Annual Leave days"] },
      { type: "subheading", text: "Splitting the 10 Annual Leave Days" },
      { type: "p", text: "Employees may use their 10 Annual Leave days in one period or split them into separate periods. If the 10 days are divided into two major blocks — such as 5 days + 5 days — there must be a minimum gap of 7 full calendar days between the two periods, and the employee must return to work during this gap." },
      { type: "example", lines: ["Annual Leave: Monday–Friday (5 days)", "Gap: Minimum 7 full calendar days", "Annual Leave: Monday–Friday (5 days)"] },
      { type: "p", text: "The purpose of this rule is to prevent employees from creating one extended absence by dividing their Annual Leave into back-to-back blocks." },
      { type: "subheading", text: "Approval & Business Coverage" },
      { type: "p", text: "Annual Leave is an employee's entitlement, and management should not unreasonably prevent an employee from using their available leave. However, HR/management may request alternative dates or delay approval where simultaneous leave would create a significant operational, project, or team-coverage issue." },
      { type: "callout", text: "ANNUAL LEAVE REQUESTS THAT DO NOT MEET THE ABOVE REQUIREMENTS MAY NOT BE APPROVED." },
    ],
  },
  {
    id: "casual",
    title: "2. Casual Leave — 10 Days",
    blocks: [
      { type: "subheading", text: "Purpose" },
      { type: "p", text: "Each eligible employee is entitled to 10 Casual Leave days per leave year. Casual Leave is intended for short-term personal or unexpected matters, including:" },
      { type: "list", items: ["Personal or medical appointments", "Family matters and responsibilities", "Bank or government work", "Household matters and urgent errands", "Unexpected personal commitments", "Short-notice travel", "Important social or personal events", "Any situation requiring the employee's immediate attention"] },
      { type: "p", text: "Employees are not required to provide unnecessary personal details when requesting Casual Leave." },
      { type: "subheading", text: "Maximum Two Consecutive Casual Leaves" },
      { type: "callout", text: "AN EMPLOYEE MAY TAKE A MAXIMUM OF 2 CONSECUTIVE CASUAL LEAVE DAYS AT A TIME. Three or more consecutive Casual Leave days are not permitted." },
      { type: "example", lines: ["Monday + Tuesday = Allowed", "Monday + Tuesday + Wednesday = Not Allowed"] },
      { type: "subheading", text: "Taking Another Casual Leave Block" },
      { type: "p", text: "If an employee has already taken 2 consecutive Casual Leave days and wishes to take another block of Casual Leave, they must first work for 2 full working days." },
      { type: "callout", text: "THE TWO-DAY GAP MUST CONSIST OF ACTUAL WORKING DAYS. WEEKENDS, PUBLIC HOLIDAYS, OTHER LEAVE, OR UNAUTHORIZED ABSENCE DO NOT COUNT." },
      { type: "p", text: "After completing the required two working days, the employee may request another block of up to 2 consecutive Casual Leave days, subject to approval and available leave balance. This arrangement is permitted, subject to approval:" },
      { type: "example", lines: ["Monday — Casual Leave", "Tuesday — Casual Leave", "Wednesday — Working Day", "Thursday — Working Day", "Friday — Casual Leave", "Saturday — Weekend", "Sunday — Weekend", "Monday — Casual Leave"] },
      { type: "subheading", text: "Failure to Complete the Two-Working-Day Gap" },
      { type: "p", text: "If the employee does not actually work the required two working days, the gap requirement is not considered fulfilled. Any absence during those required working days that is not covered by an approved leave entitlement will be treated as Unpaid Leave/Unpaid Absence. Weekends, holidays, unauthorized absence, or another leave category cannot be used to bypass the requirement." },
      { type: "example", lines: ["Monday — Casual Leave", "Tuesday — Casual Leave", "Wednesday — Not Worked", "Thursday — Not Worked", "Friday — Casual Leave"] },
      { type: "p", text: "Wednesday and Thursday do not satisfy the required two-working-day gap and will be treated according to the company's unpaid-leave/absence rules unless another approved leave category legitimately applies." },
      { type: "subheading", text: "Casual Leave Cannot Extend Annual Leave" },
      { type: "callout", text: "CASUAL LEAVE CANNOT BE TAKEN DIRECTLY BEFORE OR DIRECTLY AFTER ANNUAL LEAVE FOR THE PURPOSE OF EXTENDING THE ANNUAL LEAVE PERIOD." },
      { type: "list", items: ["Annual Leave → Casual Leave — not permitted when used to extend Annual Leave", "Casual Leave → Annual Leave — not permitted when used to extend Annual Leave"] },
      { type: "p", text: "This restriction is intended to ensure that Casual Leave is used for its designated purpose and not as an extension of Annual Leave." },
    ],
  },
  {
    id: "sick",
    title: "3. Sick Leave — 8 Days",
    blocks: [
      { type: "subheading", text: "Purpose" },
      { type: "p", text: "Each employee is entitled to 8 Sick Leave days per leave year. Sick Leave is intended strictly for genuine health and medical reasons, including:" },
      { type: "list", items: ["Personal illness, fever, flu, or infection", "Injury", "Medical appointments or procedures", "Recovery from illness or medical treatment", "Physical or mental health recovery", "Any other legitimate health-related condition requiring rest"] },
      { type: "p", text: "Employees should not feel pressured to work while genuinely unwell, including when working remotely." },
      { type: "subheading", text: "Sick Leave Notice" },
      { type: "p", text: "Illness cannot always be predicted, so 24–48 hours' advance notice is not required where it is not reasonably possible. Employees must notify their manager/HR as soon as possible after becoming aware that they are unable to work — when possible, before the employee's scheduled working hours begin." },
      { type: "subheading", text: "Medical Documentation" },
      { type: "p", text: "Medical documentation is not normally required for short-term Sick Leave. However, HR/management may request reasonable supporting documentation where:" },
      { type: "list", items: ["Sick Leave continues for several consecutive working days", "There is a repeated pattern requiring clarification", "The leave relates to a significant medical event", "Documentation is required by applicable law or company policy"] },
      { type: "p", text: "Any medical information provided will be kept confidential and shared only with those who genuinely need access to it." },
      { type: "subheading", text: "Personal Privacy" },
      { type: "p", text: "Employees are only required to provide sufficient information to establish that the leave is health-related and to communicate the expected duration of absence." },
      { type: "callout", text: "EMPLOYEES ARE NOT REQUIRED TO DISCLOSE UNNECESSARY PRIVATE, MEDICAL, FAMILY, OR PERSONAL DETAILS." },
      { type: "p", text: "Managers should focus on work planning and team coverage rather than investigating an employee's private circumstances." },
      { type: "subheading", text: "Sick Leave Cannot Be Used to Extend Annual Leave" },
      { type: "callout", text: "SICK LEAVE CANNOT BE TAKEN DIRECTLY BEFORE OR DIRECTLY AFTER ANNUAL LEAVE FOR THE PURPOSE OF EXTENDING THE ANNUAL LEAVE PERIOD." },
      { type: "list", items: ["Annual Leave → Sick Leave", "Sick Leave → Annual Leave", "Annual Leave → Casual Leave → Sick Leave", "Sick Leave → Casual Leave → Annual Leave"] },
      { type: "p", text: "HR will assess leave requests based on the complete period of absence, rather than treating separate leave requests as unrelated. This restriction is intended to prevent misuse of Sick Leave as an extension of Annual Leave and does not prevent genuine illness or medical emergencies — genuine cases will be reviewed based on the circumstances and, where appropriate, supporting documentation." },
    ],
  },
  {
    id: "separation",
    title: "Required Working-Day Separation From Annual Leave",
    blocks: [
      { type: "p", text: "For clarity, Casual Leave and Sick Leave should not be used as an immediate extension of Annual Leave." },
      { type: "p", text: "Where an employee needs to take Casual Leave after returning from Annual Leave, the employee should first return to their normal work schedule." },
      { type: "p", text: "Where an employee becomes genuinely sick immediately before or after Annual Leave, the situation may be reviewed by HR based on the circumstances and any required supporting documentation." },
      { type: "callout", text: "THIS RULE IS NOT INTENDED TO PREVENT GENUINE MEDICAL EMERGENCIES OR LEGITIMATE SICKNESS. IT IS INTENDED TO PREVENT THE MISUSE OF SICK OR CASUAL LEAVE AS AN EXTENSION OF ANNUAL LEAVE." },
    ],
  },
  {
    id: "application",
    title: "Leave Application & Emergency Notification",
    blocks: [
      { type: "p", text: "All employees must apply for leave through the official leave portal as usual. The portal is the official record for all leave requests." },
      { type: "p", text: "In case of an extreme emergency where the employee is unable to apply through the portal immediately, they may inform their manager or HR through WhatsApp or another available communication channel. The employee must then submit the leave request on the portal as soon as possible once the emergency has been addressed." },
      { type: "callout", text: "THE LEAVE PORTAL IS THE OFFICIAL METHOD FOR APPLYING FOR LEAVE." },
    ],
  },
  {
    id: "expiry",
    title: "Expiry of Unused Leave",
    blocks: [
      { type: "p", text: "The company does not offer a carry-forward facility for unused leave." },
      { type: "p", text: "All Annual Leave, Casual Leave, and Sick Leave entitlements are allocated for the applicable leave year only. Any unused leave remaining at the end of the leave year will automatically expire and will not be transferred, accumulated, or added to the employee's entitlement for the following leave year." },
      { type: "callout", text: "UNUSED LEAVE CANNOT BE CARRIED FORWARD TO THE NEXT LEAVE YEAR." },
      { type: "p", text: "Employees should therefore plan their leave in advance and make reasonable use of their available entitlement throughout the year rather than waiting until the end of the leave year. The company will not be responsible for unused leave resulting from an employee's failure to plan or submit leave requests within the applicable leave year." },
    ],
  },
  {
    id: "probation",
    title: "Leave During Probation",
    blocks: [
      { type: "p", text: "Employees serving a three-month probation period will have limited access to Casual Leave during their probation, while Sick Leave remains available without a probationary restriction." },
      { type: "subheading", text: "Casual Leave During Probation" },
      { type: "p", text: "Permanent employees are entitled to 10 Casual Leave days per leave year. However, employees currently on probation may use a maximum of 3 Casual Leave days during their entire three-month probation period." },
      { type: "callout", text: "AN EMPLOYEE ON PROBATION CANNOT USE MORE THAN 3 CASUAL LEAVE DAYS DURING THE ENTIRE THREE-MONTH PROBATION PERIOD." },
      { type: "list", items: ["During 3-month probation: maximum 3 Casual Leave days (maximum 2 consecutive)", "After successful completion of probation: the remaining 7 Casual Leave days become available", "Casual Leave cannot be used beyond the applicable limit during probation", "The three Casual Leave days available during probation are part of the total 10-day entitlement — they are not additional leave days"] },
      { type: "subheading", text: "Sick Leave During Probation" },
      { type: "callout", text: "THERE IS NO SEPARATE OR REDUCED SICK LEAVE LIMIT DURING PROBATION." },
      { type: "p", text: "Employees on probation may use their Sick Leave when genuinely ill, requiring medical attention, medical recovery, or another legitimate health-related need. The full annual entitlement of 8 days remains available during probation." },
      { type: "subheading", text: "Summary" },
      { type: "list", items: ["Casual Leave: maximum 3 days during probation, with the remaining 7 days available after successful completion of probation.", "Sick Leave: 8 days per year, with no additional probationary limit."] },
    ],
  },
  {
    id: "communication",
    title: "Policy Communication",
    blocks: [
      { type: "p", text: "The official Leave & Time-Off Policy is maintained in one central location accessible to all employees — the Archilance portal. The company may communicate reminders through:" },
      { type: "list", items: ["Email", "WhatsApp", "Slack/Teams", "HR software", "Company meetings"] },
      { type: "subheading", text: "The \"No Surprises\" Rule" },
      { type: "stat", text: "No surprises for the employee. No surprises for the team." },
      { type: "p", text: "Employees should not suddenly disappear without communication where communication is reasonably possible. Managers should not suddenly change leave expectations without communicating clearly. HR should not introduce major leave policy changes without formally informing employees. This principle is especially important in a remote environment." },
    ],
  },
  {
    id: "etiquette",
    title: "Archilance Team Leave Etiquette",
    blocks: [
      { type: "p", text: "For a healthy remote culture, employees taking planned leave should:" },
      { type: "subheading", text: "Before Leave" },
      { type: "list", items: ["Submit the leave request", "Complete important tasks where possible", "Share a handover", "Update relevant stakeholders", "Set an appropriate out-of-office status"] },
      { type: "subheading", text: "After Leave" },
      { type: "list", items: ["Review important updates", "Resume responsibilities", "Follow up on pending tasks"] },
    ],
  },
  {
    id: "final",
    title: "Final Note",
    blocks: [
      { type: "p", text: "At Archilance, we believe that a clear and fair leave policy is essential for maintaining a healthy, productive, and respectful workplace. This policy is designed to provide employees with reasonable flexibility and adequate time off while ensuring that business operations, team responsibilities, and client commitments remain well managed." },
      { type: "p", text: "Employees are encouraged to use their leave entitlements responsibly, plan whenever possible, and communicate their leave requirements clearly. At the same time, managers and HR at Archilance are expected to apply this policy consistently, fairly, and without unnecessary barriers." },
      { type: "p", text: "The purpose of this policy is not to make taking leave difficult, but to create clarity, fairness, accountability, and balance for everyone at Archilance." },
      { type: "stat", text: "TAKE YOUR LEAVE. REST WHEN YOU NEED TO. COMMUNICATE RESPONSIBLY. AND RETURN READY TO DO YOUR BEST WORK." },
      { type: "p", text: "This policy serves as the official reference for all leave-related matters at Archilance and may be reviewed or updated by the company when necessary." },
    ],
  },
];

/**
 * Per-team overrides layered onto GENERAL_SECTIONS. Keyed by the exact
 * `employee_team` value stored on the employee record (see TEAM_OPTIONS in
 * EmployeeFormPage.jsx). A team with no entry here just sees the general
 * policy unchanged — add a new key the same shape as "BIM Team" once that
 * team gets its own addendum.
 */
export const TEAM_ADDENDA = {
  "BIM Team": {
    label: "BIM Team",
    casualTotal: 18,
    totalLeaveDays: 36,
    sectionNotes: {
      entitlement:
        "BIM Team members receive public holidays only for the two Eid holidays and do not receive the other public holidays observed by the company. To compensate, they receive 8 additional Casual Leave days per year — for a total entitlement of 10 Annual Leaves + 18 Casual Leaves + 8 Sick Leaves = 36 Total Leave Days.",
      casual:
        "Employees covered under the BIM public-holiday compensation arrangement are entitled to an additional 8 Casual Leave days, for a total of 18 Casual Leave days. The additional 8 days are part of the Casual Leave balance and follow the usage rules set out below.",
    },
    extraSections: [
      {
        id: "bim-additional-casual",
        insertAfter: "entitlement",
        title: "Additional Casual Leaves for Public-Holiday Compensation — BIM Team",
        blocks: [
          { type: "p", text: "The additional 8 Casual Leave days apply exclusively to the BIM Team." },
          { type: "p", text: "BIM Team members will receive public holidays only for the two Eid holidays. They will not receive other public holidays observed by the company. To compensate for this arrangement, BIM Team members will receive 8 additional Casual Leave days per year." },
          { type: "stat", text: "10 Annual Leaves + 18 Casual Leaves + 8 Sick Leaves = 36 Total Leave Days" },
          { type: "p", text: "The additional 8 Casual Leave days are part of the employee's Casual Leave balance and are subject to all applicable Casual Leave rules and restrictions." },
          { type: "subheading", text: "Additional Casual Leave Usage Criteria" },
          {
            type: "list",
            items: [
              "An employee may take a maximum of 2 consecutive additional Casual Leave days at one time.",
              "After taking 2 consecutive additional Casual Leave days, the employee must complete a minimum gap of 2 working days before applying for another set of additional Casual Leaves.",
              "After completing the required 2-working-day gap, the employee may apply for another maximum of 2 consecutive additional Casual Leave days.",
              "Employees are not permitted to take more than 2 additional Casual Leave days consecutively under this arrangement.",
              "All leave requests remain subject to the company's applicable leave approval procedures and operational requirements.",
              "These restrictions apply specifically to the additional 8 Casual Leave days provided as compensation for public holidays.",
            ],
          },
        ],
      },
    ],
  },
};

/** Default per-team totals for the entitlement summary chips, before an
 *  addendum overrides them (see TEAM_ADDENDA above). */
export const BASE_TOTALS = { annual: 10, casual: 10, sick: 8, marriage: 15, total: 28 };
