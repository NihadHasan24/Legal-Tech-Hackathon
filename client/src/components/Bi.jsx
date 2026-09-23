import { useState, useSyncExternalStore } from 'react'

// Every screen renders in one language, English or Bangla, picked with the switch in the header.
const words = {
  // Application, review, priority, identity
  SUBMITTED: ['Submitted', 'জমা হয়েছে'], ACCEPTED: ['Accepted', 'গৃহীত'],
  PENDING_REVIEW: ['Pending review', 'পর্যালোচনা বাকি'], NEEDS_INFORMATION: ['Needs information', 'আরও তথ্য দরকার'],
  READY_FOR_DECISION: ['Ready for decision', 'সিদ্ধান্তের জন্য প্রস্তুত'],
  URGENT: ['Urgent', 'জরুরি'], ROUTINE: ['Routine', 'সাধারণ'],
  INCOMPLETE: ['Incomplete', 'অসম্পূর্ণ'], VERIFIED: ['Verified', 'যাচাইকৃত'], REVOKED: ['Revoked', 'বাতিল'], PENDING: ['Pending', 'অপেক্ষমাণ'],
  // Channels and contact
  VOICE_SIM: ['16699 voice', '১৬৬৯৯ ভয়েস'], HELPLINE_SIM: ['Helpline', 'হেল্পলাইন'], UDC: ['UDC assisted', 'ইউডিসি সহায়তা'],
  DLAO: ['DLAO office', 'ডিএলএও অফিস'], WEB: ['Web', 'ওয়েব'], PHONE: ['Phone', 'ফোন'], SMS: ['SMS', 'এসএমএস'], IN_PERSON: ['In person', 'সরাসরি'],
  REMOTE: ['Remote', 'অনলাইনে'], HYBRID: ['Hybrid', 'মিশ্র'],
  BLOCKED_UNSAFE: ['Blocked: unsafe', 'অনিরাপদ, বন্ধ'], NO_ANSWER: ['No answer', 'কেউ ধরেনি'],
  UNKNOWN_PERSON: ['Someone else answered', 'অন্য কেউ ধরেছে'], APPLICANT_REACHED: ['Applicant reached', 'আবেদনকারীর সাথে কথা হয়েছে'],
  DISCLOSE_NOTHING: ['Say nothing about the case', 'মামলার কিছু বলবেন না'], APPROVED_NEUTRAL_ONLY: ['Approved neutral words only', 'শুধু অনুমোদিত নিরপেক্ষ কথা'],
  // Roles
  DLAO_OFFICER: ['DLAO officer', 'ডিএলএও কর্মকর্তা'], CASE_SUPPORT: ['Case support', 'মামলা সহায়তা'], MEDIATOR: ['Mediator', 'মধ্যস্থতাকারী'],
  RECEIVING_DLAO: ['Receiving DLAO', 'গ্রহণকারী ডিএলএও'], HELPLINE_AGENT: ['Helpline agent', 'হেল্পলাইন কর্মী'], UDC_OPERATOR: ['UDC operator', 'ইউডিসি অপারেটর'],
  PANEL_LAWYER: ['Panel lawyer', 'প্যানেল আইনজীবী'], CLAO: ['CLAO', 'সিএলএও'], SYSTEM: ['System', 'সিস্টেম'],
  // Tasks, documents, access
  OPEN: ['Open', 'চলমান'], DONE: ['Done', 'সম্পন্ন'], READABLE: ['Readable', 'পড়া যায়'], UNREADABLE: ['Unreadable', 'পড়া যায় না'],
  STANDARD: ['Standard', 'সাধারণ'], RESTRICTED: ['Restricted', 'সীমিত'], GRANTED: ['Granted', 'অনুমতি দেওয়া'], DENIED: ['Denied', 'অনুমতি নেই'],
  PROPOSED: ['Proposed', 'প্রস্তাবিত'], APPROVED: ['Approved', 'অনুমোদিত'], DECLINED: ['Declined', 'প্রত্যাখ্যাত'], COMPLETED: ['Completed', 'সম্পন্ন'],
  // Facts
  APPLICANT_REPORTED: ['Applicant reported', 'আবেদনকারীর দেওয়া'], APPLICANT_CONFIRMED: ['Applicant confirmed', 'আবেদনকারী নিশ্চিত করেছেন'],
  REPRESENTATIVE_REPORTED: ['Representative reported', 'প্রতিনিধির দেওয়া'], INTERMEDIARY_TRANSLATED: ['Translated by helper', 'সহায়তাকারীর অনুবাদ'],
  INTERMEDIARY_TYPED: ['Typed by helper', 'সহায়তাকারীর টাইপ'], STAFF_ENTERED: ['Staff entered', 'কর্মীর লেখা'], DOCUMENT_EXTRACTED: ['From document', 'নথি থেকে'],
  AI_INFERRED: ['AI inferred', 'এআই অনুমান'], UNKNOWN_OR_UNVERIFIED: ['Unverified', 'যাচাই হয়নি'],
  VOICE: ['Voice', 'ভয়েস'], TYPED: ['Typed', 'টাইপ করা'], TRANSLATED: ['Translated', 'অনূদিত'], DOCUMENT: ['Document', 'নথি'], STAFF: ['Staff', 'কর্মী'], AI: ['AI', 'এআই'],
  // Referral and routing
  SENT: ['Sent', 'পাঠানো হয়েছে'], ACKNOWLEDGED: ['Acknowledged', 'প্রাপ্তি স্বীকৃত'], RETURNED: ['Returned', 'ফেরত এসেছে'],
  REFER: ['Refer to another office', 'অন্য অফিসে পাঠান'], RETAIN: ['Keep in this office', 'এই অফিসেই রাখুন'],
  // Lawyer work
  REASSIGNED: ['Reassigned', 'পুনর্বণ্টিত'], MISSED: ['Missed', 'দেওয়া হয়নি'], SUBMITTED_ON_TIME: ['Sent on time', 'সময়মতো দেওয়া'],
  SUBMITTED_LATE: ['Sent late', 'দেরিতে দেওয়া'], CANCELLED: ['Cancelled', 'বাতিল'], CONTINUED: ['Continued', 'চলমান রাখা হয়েছে'], LIFTED: ['Lifted', 'তুলে নেওয়া'],
  CASE_PREPARATION: ['Case preparation', 'মামলার প্রস্তুতি'], HEARING_ATTENDANCE: ['Hearing attendance', 'শুনানিতে উপস্থিতি'],
  CLAIM_REVIEW: ['Claim review', 'দাবি যাচাই'], RECONCILIATION: ['Reconciliation', 'হিসাব মিলানো'],
  NOT_RECORDED: ['Not recorded', 'লেখা নেই'], UNDER_REVIEW: ['Under review', 'যাচাই চলছে'], RECONCILED: ['Reconciled', 'মিলানো হয়েছে'],
  PAYMENT_RECORDED: ['Payment recorded', 'পেমেন্ট লেখা হয়েছে'], DISPUTED: ['Disputed', 'আপত্তি আছে'],
  // Triage
  LABOUR: ['Labour', 'শ্রম'], FAMILY: ['Family', 'পারিবারিক'], LAND: ['Land', 'জমি'], CRIMINAL: ['Criminal', 'ফৌজদারি'], OTHER: ['Other', 'অন্যান্য'], UNCERTAIN: ['Uncertain', 'অনিশ্চিত'],
  PRIORITIZE_FOR_HUMAN_REVIEW: ['Review first', 'আগে পর্যালোচনা করুন'], CONTINUE_ROUTINE_REVIEW: ['Routine review', 'সাধারণ পর্যালোচনা'],
  SEEK_MORE_INFORMATION: ['Get more information', 'আরও তথ্য নিন'], REQUEST_JURISDICTION_REVIEW: ['Check jurisdiction', 'এখতিয়ার যাচাই করুন'], NO_CHANGE: ['No change', 'পরিবর্তন নেই'],
  CASE_CATEGORIZER: ['Case type', 'মামলার ধরন'], PROCESS_SAFETY: ['Process and safety', 'প্রক্রিয়া ও নিরাপত্তা'], URGENCY_ROUTING: ['Urgency and routing', 'জরুরিতা ও পথ'],
  SAFETY_REVIEW: ['Safety review', 'নিরাপত্তা যাচাই'], ROUTINE_REVIEW: ['Routine review', 'সাধারণ পর্যালোচনা'], URGENT_REVIEW: ['Urgent review', 'জরুরি পর্যালোচনা'],
  ROUTING_REVIEW: ['Routing review', 'পথ যাচাই'], SAFE_CONTACT_REVIEW: ['Safe contact review', 'নিরাপদ যোগাযোগ যাচাই'],
  MISSING_INFORMATION_REVIEW: ['Missing information', 'তথ্য বাকি'], RESTRICTED_EVIDENCE_REVIEW: ['Restricted evidence review', 'সীমিত প্রমাণ যাচাই'],
  HIGH: ['High', 'উচ্চ'], LOW: ['Low', 'নিম্ন'], UNKNOWN: ['Unknown', 'অজানা'], PENDING_HUMAN_REVIEW: ['Waiting for officer', 'কর্মকর্তার অপেক্ষায়'], REVIEWED: ['Reviewed', 'পর্যালোচিত'],
  // Duplicates
  MATCH: ['Same', 'মিল'], SIMILAR: ['Similar', 'কাছাকাছি'], DIFFERENT: ['Different', 'ভিন্ন'],
  CONFIRMED_DUPLICATE: ['Same person, kept separate', 'একই ব্যক্তি, আলাদা রাখা হয়েছে'], NOT_DUPLICATE: ['Different people', 'ভিন্ন ব্যক্তি'],
  // Mediation
  REGISTRATION: ['Registered', 'নিবন্ধন'], SCHEDULING_NOTICES: ['Schedule and notices', 'সময় ও নোটিশ'], DOCUMENT_REVIEW: ['Documents', 'নথি যাচাই'],
  ATTENDANCE: ['Attendance', 'উপস্থিতি'], MEDIATION: ['Mediation', 'মধ্যস্থতা'], DRAFT_OUTCOME: ['Draft', 'খসড়া'], SIGNATURES: ['Signatures', 'স্বাক্ষর'],
  PENDING_CLAO_CERTIFICATION: ['Pending CLAO certification', 'সিএলএও সনদের অপেক্ষায়'], CERTIFIED_FINAL: ['Certified', 'সনদপ্রাপ্ত'],
  LEGAL_EFFECT_REQUIRES_AUTHORISED_REVIEW: ['Needs authorised legal review', 'অনুমোদিত আইনি পর্যালোচনা দরকার'],
  ATTENDED: ['Attended', 'উপস্থিত'], REPRESENTED: ['Represented', 'প্রতিনিধি উপস্থিত'], ABSENT: ['Absent', 'অনুপস্থিত'],
  AGREEMENT_REACHED: ['Agreement reached', 'সমঝোতা হয়েছে'], NO_AGREEMENT: ['No agreement', 'সমঝোতা হয়নি'],
  DELIVERED: ['Delivered by a person', 'একজন কর্মী পৌঁছে দিয়েছেন'], NOT_DELIVERED: ['Not delivered', 'পৌঁছানো হয়নি'],
  PARTY_A: ['Party A', 'পক্ষ ক'], PARTY_B: ['Party B', 'পক্ষ খ'], HUMAN_REVIEW: ['Mediator review', 'মধ্যস্থতাকারীর পর্যালোচনা'],
  MAINTENANCE: ['Maintenance', 'ভরণপোষণ'], PROPERTY: ['Property', 'সম্পত্তি'], UNVERIFIED: ['Unverified', 'যাচাই হয়নি'], APPLICABLE_VERIFIED: ['Applicable, verified', 'প্রযোজ্য, যাচাইকৃত'],
  // History events
  APPLICATION_SUBMITTED: ['Application submitted', 'আবেদন জমা'], APPLICATION_REVIEWED: ['Application reviewed', 'আবেদন পর্যালোচিত'],
  APPLICATION_ACCEPTED: ['Application accepted', 'আবেদন গৃহীত'], APPLICANT_CORRECTION_ATTESTED: ['Applicant correction confirmed', 'আবেদনকারীর সংশোধন নিশ্চিত'],
  ASSISTANCE_RECORDED: ['Assistance recorded', 'সহায়তার তথ্য লেখা'], CALL_RECORDING_STORED: ['Call recording saved', 'কল রেকর্ড সংরক্ষিত'],
  CONSENT_RECORDED: ['Consent recorded', 'সম্মতি লেখা'], CONTACT_ATTEMPT_LOGGED: ['Contact attempt logged', 'যোগাযোগের চেষ্টা লেখা'],
  DOCUMENT_BRIEFING_APPROVED: ['Document briefing approved', 'নথির সারসংক্ষেপ অনুমোদিত'], DOCUMENT_BRIEFING_PROPOSED: ['Document briefing drafted', 'নথির সারসংক্ষেপ খসড়া'],
  DOCUMENT_VERSION_ADDED: ['Document version added', 'নথির নতুন সংস্করণ'], DOCUMENT_METADATA_CREATED: ['Document added', 'নথি যোগ'],
  DOCUMENT_TEXT_UPLOADED: ['Document text uploaded', 'নথির লেখা আপলোড'], FACT_RECORDED: ['Fact recorded', 'তথ্য লেখা'],
  HELPLINE_STATUS_LOOKUP: ['Helpline status lookup', 'হেল্পলাইনে অবস্থা জানা'], HUMAN_PRIORITY_OVERRIDE: ['Priority set by officer', 'কর্মকর্তা অগ্রাধিকার ঠিক করেছেন'],
  HUMAN_ROUTING_DECISION: ['Route decided by officer', 'কর্মকর্তা পথ ঠিক করেছেন'], JURISDICTION_ESCALATED: ['Jurisdiction escalated', 'এখতিয়ার প্রশ্ন ঊর্ধ্বতনে'],
  OFFLINE_CONFLICT_DETECTED: ['Offline conflict found', 'অফলাইন বিরোধ পাওয়া গেছে'], OFFLINE_CONFLICT_RESOLVED: ['Offline conflict resolved', 'অফলাইন বিরোধ মীমাংসা'],
  OFFLINE_DRAFT_CREATED: ['Offline draft created', 'অফলাইন খসড়া তৈরি'], OFFLINE_MUTATION_SYNCED: ['Offline change synced', 'অফলাইন পরিবর্তন সিঙ্ক'],
  RECORDING_NOTICE_GIVEN: ['Recording notice given', 'রেকর্ডিংয়ের কথা জানানো'], REFERRAL_ACK_OVERDUE: ['Referral acknowledgement overdue', 'রেফারেলের প্রাপ্তি স্বীকার বাকি'],
  REFERRAL_SENT: ['Referral sent', 'রেফারেল পাঠানো'], REFERRAL_ACKNOWLEDGED: ['Referral acknowledged', 'রেফারেলের প্রাপ্তি স্বীকৃত'],
  REFERRAL_ACCEPTED: ['Referral accepted', 'রেফারেল গৃহীত'], REFERRAL_RETURNED: ['Referral returned', 'রেফারেল ফেরত'],
  REPRESENTATION_RECORDED: ['Representative recorded', 'প্রতিনিধির তথ্য লেখা'], SAFE_CONTACT_UPDATED: ['Safe contact updated', 'নিরাপদ যোগাযোগ হালনাগাদ'],
  TASK_COMPLETED: ['Task completed', 'কাজ সম্পন্ন'], TASK_CREATED: ['Task created', 'কাজ তৈরি'], TRANSCRIPT_STORED: ['Transcript saved', 'কথোপকথন সংরক্ষিত'],
  TRIAGE_ASSESSMENT_PROPOSED: ['AI triage suggested', 'এআই বাছাই পরামর্শ'], TRIAGE_HUMAN_DECISION_RECORDED: ['Triage decided by officer', 'কর্মকর্তা বাছাই সিদ্ধান্ত দিয়েছেন'],
  CASE_PLAN_UPDATED: ['Hearing or next step updated', 'শুনানি বা পরবর্তী ধাপ হালনাগাদ'], DUPLICATE_CANDIDATE_REVIEWED: ['Possible duplicate reviewed', 'সম্ভাব্য দ্বৈত আবেদন পর্যালোচিত'],
  RELATED_INCIDENT_GROUP_CREATED: ['Related cases linked', 'সম্পর্কিত মামলা যুক্ত'], RELATED_INCIDENT_EVIDENCE_LINKED: ['Shared evidence linked', 'যৌথ প্রমাণ যুক্ত'],
  PANEL_LAWYER_ASSIGNMENT_OFFERED: ['Lawyer offered the case', 'আইনজীবীকে প্রস্তাব'], PANEL_LAWYER_ACCEPTED: ['Lawyer accepted', 'আইনজীবী গ্রহণ করেছেন'],
  PANEL_LAWYER_DECLINED: ['Lawyer declined', 'আইনজীবী প্রত্যাখ্যান করেছেন'], LAWYER_UPDATE_SCHEDULED: ['Lawyer update scheduled', 'আইনজীবীর আপডেট নির্ধারিত'],
  LAWYER_UPDATE_MISSED: ['Lawyer update missed', 'আইনজীবী আপডেট দেননি'], LAWYER_PROGRESS_UPDATE_SUBMITTED: ['Lawyer update received', 'আইনজীবীর আপডেট পাওয়া গেছে'],
  LAWYER_NEW_ASSIGNMENT_HOLD_TRIGGERED: ['Lawyer put on hold', 'আইনজীবীর নতুন নিয়োগ স্থগিত'], LAWYER_ASSIGNMENT_HOLD_REVIEWED: ['Lawyer hold reviewed', 'স্থগিতাদেশ পর্যালোচিত'],
  LAWYER_CHANGE_REQUEST: ['Lawyer change requested', 'আইনজীবী বদলের অনুরোধ'], LAWYER_CHANGE_REQUEST_REVIEWED: ['Lawyer change request reviewed', 'বদলের অনুরোধ পর্যালোচিত'],
  LAWYER_CHANGE_REVIEW_TASK_CREATED: ['Lawyer change review task', 'বদলের অনুরোধ যাচাইয়ের কাজ'], LAWYER_HOLD_REVIEW_TASK_CREATED: ['Lawyer hold review task', 'স্থগিতাদেশ যাচাইয়ের কাজ'],
  LAWYER_PAYMENT_STATUS_RECORDED: ['Payment status recorded', 'পেমেন্টের অবস্থা লেখা'], MEDIATION_REGISTERED: ['Mediation registered', 'মধ্যস্থতা নিবন্ধিত'],
  MEDIATION_CLAIMED: ['Mediator assigned', 'মধ্যস্থতাকারী দায়িত্ব নিয়েছেন'], MEDIATION_SCHEDULED: ['Mediation scheduled', 'মধ্যস্থতার সময় নির্ধারিত'],
  MEDIATION_STAGE_ADVANCED: ['Mediation moved to next stage', 'মধ্যস্থতা পরের ধাপে'], MEDIATION_DOCUMENTS_REVIEWED: ['Mediation documents reviewed', 'মধ্যস্থতার নথি যাচাই'],
  MEDIATION_ATTENDANCE_RECORDED: ['Attendance recorded', 'উপস্থিতি লেখা'], MEDIATION_OUTCOME_RECORDED: ['Mediation outcome recorded', 'মধ্যস্থতার ফল লেখা'],
  MEDIATION_SIGNATURE_RECORDED: ['Signature recorded', 'স্বাক্ষর লেখা'], MEDIATION_LEGAL_APPLICABILITY_RECORDED: ['Legal applicability recorded', 'আইনি প্রযোজ্যতা লেখা'],
  SETTLEMENT_DRAFT_PROPOSED: ['Settlement draft prepared', 'মীমাংসার খসড়া তৈরি'], SETTLEMENT_DRAFT_AMENDED: ['Settlement draft edited', 'মীমাংসার খসড়া সম্পাদিত'],
  SETTLEMENT_HUMAN_REVIEW_RECORDED: ['Settlement draft reviewed', 'মীমাংসার খসড়া পর্যালোচিত'], CLAO_CERTIFICATION_RECORDED: ['CLAO certified', 'সিএলএও সনদ দিয়েছেন'],
  SIGNATURE_VERIFICATION_FAILED: ['Signature check failed', 'স্বাক্ষর যাচাই ব্যর্থ'],
  // Queue flags and local drafts
  NEW: ['New', 'নতুন'], URGENT_RECOMMENDATION: ['Urgent recommendation', 'জরুরি সুপারিশ'], OVERDUE: ['Overdue', 'সময় পেরিয়েছে'],
  REFERRAL_WAITING: ['Referral waiting', 'রেফারেল অপেক্ষায়'], LAWYER_UPDATE_OVERDUE: ['Lawyer update overdue', 'আইনজীবীর আপডেট বাকি'],
  DRAFT: ['Draft', 'খসড়া'], QUEUED: ['Queued', 'সারিতে'], CONFLICT: ['Conflict', 'বিরোধ'], SERVER: ['Server', 'সার্ভার'], LOCAL: ['Local', 'স্থানীয়'],
  // Fact values
  YES: ['Yes', 'হ্যাঁ'], NO: ['No', 'না'], AVAILABLE: ['Available', 'আছে'], UNAVAILABLE: ['Not available', 'নেই'],
  URGENT_HANDOFF: ['Urgent callback', 'জরুরি ফোন ফেরত'],
  // Server wording: task titles, fact fields, comparison rows
  'Review new application': ['Review new application', 'নতুন আবেদন পর্যালোচনা করুন'], 'Decide reviewed application': ['Decide reviewed application', 'পর্যালোচিত আবেদনে সিদ্ধান্ত দিন'],
  'Repeat application review': ['Repeat application review', 'আবেদন আবার পর্যালোচনা করুন'], 'Request missing information': ['Request missing information', 'বাকি তথ্য চেয়ে নিন'],
  'Plan next service step': ['Plan next service step', 'পরবর্তী সেবার ধাপ ঠিক করুন'], 'Plan safer follow-up': ['Plan safer follow-up', 'আরও নিরাপদ ফলো-আপ ঠিক করুন'],
  'Urgent human callback requested': ['Urgent human callback requested', 'জরুরি ফোন ফেরত দিতে হবে'], 'Review translated assisted intake': ['Review translated assisted intake', 'অনূদিত সহায়তা-আবেদন পর্যালোচনা করুন'],
  'Referral not acknowledged: follow up': ['Referral not acknowledged: follow up', 'রেফারেলের প্রাপ্তি স্বীকার হয়নি: খোঁজ নিন'],
  'Referral returned: review the reason': ['Referral returned: review the reason', 'রেফারেল ফেরত: কারণ দেখুন'],
  'Review applicant lawyer-change request': ['Review applicant lawyer-change request', 'আইনজীবী বদলের অনুরোধ দেখুন'],
  'Jurisdiction escalation: authorised routing decision required': ['Jurisdiction escalation: authorised routing decision required', 'এখতিয়ার প্রশ্ন: অনুমোদিত কর্মকর্তাকে পথ ঠিক করতে হবে'],
  'safety.urgent': ['Urgent danger', 'জরুরি বিপদ'], 'location.district': ['District', 'জেলা'], 'intake.callback_reason': ['Callback reason', 'ফোন ফেরতের কারণ'],
  'complaint.summary': ['Problem', 'সমস্যা'], 'complaint.original': ['Original statement', 'মূল বক্তব্য'], 'complaint.translation': ['Translation', 'অনুবাদ'],
  'identity.document_access': ['ID document', 'পরিচয়পত্র'], 'contact.phone': ['Contact number', 'যোগাযোগের নম্বর'], 'person.date_of_birth': ['Date of birth', 'জন্মতারিখ'],
  'triage.case_category': ['Case type', 'মামলার ধরন'], Name: ['Name', 'নাম'], 'Contact number': ['Contact number', 'যোগাযোগের নম্বর'],
  'Date of birth': ['Date of birth', 'জন্মতারিখ'], District: ['District', 'জেলা'],
}

const humanize = (code) => /^[A-Z0-9_]+$/.test(code) ? code.charAt(0) + code.slice(1).toLowerCase().replaceAll('_', ' ') : code

// The chosen language lives here. The header switch sets it, App subscribes, and a change re-renders the whole tree,
// so every helper below reads the new value. The choice is remembered on this device.
const storageKey = 'dlas-language'
const listeners = new Set()
let language = (() => {
  try { const saved = localStorage.getItem(storageKey); if (saved === 'bn' || saved === 'en') return saved } catch { /* storage blocked */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('bn') ? 'bn' : 'en'
})()
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener) }
export const getLang = () => language
export const useLang = () => useSyncExternalStore(subscribe, getLang, getLang)
export function setLang(next) {
  language = next
  try { localStorage.setItem(storageKey, next) } catch { /* the choice just won't persist */ }
  listeners.forEach((listener) => listener())
}

export const bi = (en, bn) => language === 'bn' ? bn : en
export const num = (value) => language === 'bn' ? String(value).replace(/[0-9]/g, (digit) => '০১২৩৪৫৬৭৮৯'[digit]) : String(value)
export const say = (code) => code == null || code === '' ? '' : words[code] ? bi(...words[code]) : humanize(String(code))
export const when = (value) => value ? new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : bi('Not set', 'নির্ধারিত নয়')

// Fixed sentences the server writes into records (task steps, queue flags, triage reasons, system audit reasons).
const phrases = {
  'Not collected (callback request)': 'সংগ্রহ করা হয়নি (কলব্যাক অনুরোধ)',
  'Assign the appropriate human-led service or follow-up.': 'উপযুক্ত সেবা বা ফলো-আপের দায়িত্ব দিন।',
  'Authorised officer to accept or request more information.': 'অনুমোদিত কর্মকর্তা গ্রহণ করবেন বা আরও তথ্য চাইবেন।',
  'Collect missing information using an approved safe route.': 'অনুমোদিত নিরাপদ পথে বাকি তথ্য সংগ্রহ করুন।',
  'Recheck identity gaps, provenance, and safe contact.': 'পরিচয়ের ঘাটতি, তথ্যের উৎস ও নিরাপদ যোগাযোগ আবার দেখুন।',
  'Review intake, identity gaps, provenance, and safe contact before deciding.': 'সিদ্ধান্তের আগে আবেদন, পরিচয়ের ঘাটতি, তথ্যের উৎস ও নিরাপদ যোগাযোগ দেখুন।',
  'Check oral consent, original versus translated account, confirmation, identity, safe contact, and document checklist.': 'মৌখিক সম্মতি, মূল ও অনূদিত বক্তব্য, নিশ্চিতকরণ, পরিচয়, নিরাপদ যোগাযোগ ও নথির তালিকা দেখুন।',
  'Read the return reason and decide the next human step.': 'ফেরতের কারণ পড়ে পরবর্তী ধাপ ঠিক করুন।',
  'An unknown person answered and nothing was disclosed. Choose a safer route or time before trying again.': 'অপরিচিত কেউ ধরেছেন, কিছু বলা হয়নি। আবার চেষ্টার আগে নিরাপদ পথ বা সময় বেছে নিন।',
  'Call back only on the recorded safe number at the safe time. Use neutral wording; disclose nothing if someone else answers.': 'শুধু লেখা নিরাপদ নম্বরে, নিরাপদ সময়ে ফোন করুন। নিরপেক্ষ কথা বলুন; অন্য কেউ ধরলে কিছু বলবেন না।',
  'Review the missed mandatory updates and decide whether to continue or lift the temporary hold. This is not a misconduct finding; reviewer authority is pending policy verification.': 'বাদ পড়া আপডেটগুলো দেখে স্থগিতাদেশ বহাল রাখবেন না তুলবেন ঠিক করুন। এটি অসদাচরণের সিদ্ধান্ত নয়; পর্যালোচকের কর্তৃত্ব এখনো নিশ্চিত নয়।',
  'Review the overdue update and the safe-contact profile before any follow-up or travel. Do not use an unsafe number.': 'ফলো-আপ বা যাতায়াতের আগে বকেয়া আপডেট ও নিরাপদ যোগাযোগ দেখুন। অনিরাপদ নম্বর ব্যবহার করবেন না।',
  'Review the recorded request, case status, and safe-contact profile; decide separately whether a reassignment is appropriate.': 'অনুরোধ, মামলার অবস্থা ও নিরাপদ যোগাযোগ দেখুন; আইনজীবী বদল দরকার কি না আলাদাভাবে ঠিক করুন।',
  'Reported by a representative: authority and applicant confirmation are pending.': 'প্রতিনিধি জানিয়েছেন: অনুমতি ও আবেদনকারীর নিশ্চিতকরণ বাকি।',
  'Reported by the applicant by voice.': 'আবেদনকারী নিজে ফোনে জানিয়েছেন।',
  'Identity is incomplete.': 'পরিচয় অসম্পূর্ণ।',
  'Contact only through the active safe-contact profile with neutral wording.': 'শুধু সক্রিয় নিরাপদ যোগাযোগ পথে, নিরপেক্ষ কথায় যোগাযোগ করুন।',
  'AI flagged possible violence or danger in the caller’s words; a human must judge it.': 'কলারের কথায় এআই সম্ভাব্য সহিংসতা বা বিপদ চিহ্নিত করেছে; একজন মানুষকে বিচার করতে হবে।',
  'AI flagged possible violence or danger in the intake words.': 'আবেদনের কথায় এআই সম্ভাব্য সহিংসতা বা বিপদ চিহ্নিত করেছে।',
  'Submitted; first human review has not been recorded.': 'জমা হয়েছে; প্রথম পর্যালোচনা এখনো হয়নি।',
  'Officer requested more information.': 'কর্মকর্তা আরও তথ্য চেয়েছেন।',
  'Identity is still recorded as incomplete.': 'পরিচয় এখনো অসম্পূর্ণ।',
  'Repeated referral returns were escalated; an authorised routing decision is required.': 'বারবার রেফারেল ফেরত আসায় বিষয়টি ঊর্ধ্বতনে গেছে; অনুমোদিত কর্মকর্তাকে পথ ঠিক করতে হবে।',
  'An open task passed its explicit due date.': 'একটি চলমান কাজের নির্ধারিত সময় পেরিয়ে গেছে।',
  'The application is awaiting an officer decision. No decision has been made here.': 'আবেদনটি কর্মকর্তার সিদ্ধান্তের অপেক্ষায়। এখানে কোনো সিদ্ধান্ত হয়নি।',
  'An officer is handling the case. Use the agreed safe channel for further details.': 'একজন কর্মকর্তা মামলাটি দেখছেন। আরও জানতে সম্মত নিরাপদ পথ ব্যবহার করুন।',
  'More information is needed. Arrange a safe follow-up with the office.': 'আরও তথ্য দরকার। অফিসের সাথে নিরাপদ ফলো-আপ ঠিক করুন।',
  'A DLAO officer will review the request. This did not change the lawyer assignment.': 'একজন ডিএলএও কর্মকর্তা অনুরোধটি দেখবেন। এতে আইনজীবী বদলায়নি।',
  'Caller confirmed the read-back and submitted through the 16699 voice simulation.': 'কলার পড়ে শোনানো তথ্য নিশ্চিত করে ১৬৬৯৯ ভয়েস সিমুলেশনে জমা দিয়েছেন।',
  'Initial report through the 16699 voice simulation; authority not verified.': '১৬৬৯৯ ভয়েস সিমুলেশনে প্রথম তথ্য; অনুমতি যাচাই হয়নি।',
  'Applicant request recorded by a helpline agent. No reassignment or outbound contact occurred.': 'হেল্পলাইন কর্মী আবেদনকারীর অনুরোধ লিখেছেন। আইনজীবী বদল বা বাইরে যোগাযোগ হয়নি।',
  'Helpline agent attested caller verification and used the caller-provided lookup code on an allowed safe channel; generic status only.': 'হেল্পলাইন কর্মী কলার যাচাই করে অনুমোদিত নিরাপদ পথে কোড দিয়ে শুধু সাধারণ অবস্থা জানিয়েছেন।',
  'Repeated transfer/return threshold reached; a human routing decision is required.': 'বারবার পাঠানো/ফেরতের সীমা পূর্ণ; একজন মানুষকে পথ ঠিক করতে হবে।',
  'The acknowledgement deadline passed without acknowledgement.': 'প্রাপ্তি স্বীকারের সময় পেরিয়ে গেছে, স্বীকার করা হয়নি।',
  'No structured case category is recorded.': 'মামলার ধরন লেখা নেই।',
  'A DLAO officer must record or confirm the category.': 'একজন ডিএলএও কর্মকর্তাকে ধরন লিখতে বা নিশ্চিত করতে হবে।',
  'Category is a structured staff-entered suggestion, not a legal conclusion.': 'ধরনটি কর্মীর দেওয়া পরামর্শ, আইনি সিদ্ধান্ত নয়।',
  'No recorded high-level process flag requires escalation.': 'ঊর্ধ্বতনে পাঠানোর মতো কোনো প্রক্রিয়াগত সংকেত নেই।',
  'No safe-contact profile is recorded; do not initiate contact until a human reviews contact safety.': 'নিরাপদ যোগাযোগের তথ্য নেই; একজন মানুষ যাচাই না করা পর্যন্ত যোগাযোগ করবেন না।',
  'Review state or identity status indicates that human review may need more information.': 'পর্যালোচনা বা পরিচয়ের অবস্থা বলছে আরও তথ্য লাগতে পারে।',
  'Restricted evidence exists; confirm that only authorised staff handle it.': 'সীমিত প্রমাণ আছে; শুধু অনুমোদিত কর্মীরা দেখছেন কি না নিশ্চিত করুন।',
  'Flags are prompts for human review, not a finding or decision.': 'সংকেতগুলো পর্যালোচনার জন্য, কোনো সিদ্ধান্ত নয়।',
  'No human priority is recorded; a DLAO officer must decide the next review level.': 'অগ্রাধিকার লেখা নেই; একজন ডিএলএও কর্মকর্তাকে ঠিক করতে হবে।',
  'Current recorded priority is URGENT; confirm it against the current evidence.': 'বর্তমান অগ্রাধিকার জরুরি; বর্তমান প্রমাণের সাথে মিলিয়ে নিশ্চিত করুন।',
  'Current recorded priority is ROUTINE; confirm it against the current evidence.': 'বর্তমান অগ্রাধিকার সাধারণ; বর্তমান প্রমাণের সাথে মিলিয়ে নিশ্চিত করুন।',
  'A safety urgency flag is recorded; human priority review is needed.': 'নিরাপত্তার জরুরি সংকেত আছে; অগ্রাধিকার পর্যালোচনা দরকার।',
  'This suggestion does not set priority or choose a receiving office.': 'এই পরামর্শ অগ্রাধিকার ঠিক করে না, গ্রহণকারী অফিসও বাছাই করে না।',
  'The process/safety and urgency/routing components signal different urgency levels; a DLAO officer must resolve the conflict.': 'প্রক্রিয়া/নিরাপত্তা ও জরুরিতা/পথ অংশ ভিন্ন জরুরিতা দেখাচ্ছে; একজন ডিএলএও কর্মকর্তাকে মতভেদ মেটাতে হবে।',
}
const templates = [
  [/^An urgent fact is recorded \(safety\.urgent revision (\d+), (.+)\)\.$/, (rev, source) => `একটি জরুরি তথ্য লেখা আছে (safety.urgent সংশোধন ${num(rev)}, ${say(source.toUpperCase().replaceAll(' ', '_'))})।`],
  [/^(\d+) restricted sensitive-evidence items? (?:is|are) on file\.$/, (count) => `${num(count)}টি সীমিত সংবেদনশীল প্রমাণ আছে।`],
  [/^Human decision: (.+)\.$/, (value) => `কর্মকর্তার সিদ্ধান্ত: ${value === 'not recorded' ? 'লেখা নেই' : say(value)}।`],
  [/^(\d+) open tasks? need a human next action\.$/, (count) => `${num(count)}টি চলমান কাজে পরবর্তী পদক্ষেপ দরকার।`],
  [/^(\d+) mandatory panel-lawyer updates? (?:is|are) overdue or missed; review a safe next step before asking the applicant to travel\.$/, (count) => `আইনজীবীর ${num(count)}টি বাধ্যতামূলক আপডেট বাকি; আবেদনকারীকে আসতে বলার আগে নিরাপদ পরবর্তী ধাপ দেখুন।`],
  [/^Oldest open task is (\d+) days old; demo reminder threshold reached\.$/, (days) => `সবচেয়ে পুরোনো চলমান কাজ ${num(days)} দিনের; মনে করানোর সীমা পেরিয়েছে।`],
  [/^Awaiting acknowledgement from (\S+?)(; the deadline has passed)?\.$/, (office, late) => `${office}-এর প্রাপ্তি স্বীকারের অপেক্ষা${late ? '; সময় পেরিয়ে গেছে' : ''}।`],
  [/^Acknowledged by (\S+); awaiting accept or return\.$/, (office) => `${office} স্বীকার করেছে; গ্রহণ বা ফেরতের অপেক্ষা।`],
  [/^(\S+) did not acknowledge by the deadline\. Contact that office, or escalate for an authorised routing decision\.$/, (office) => `${office} সময়ের মধ্যে প্রাপ্তি স্বীকার করেনি। ওই অফিসে যোগাযোগ করুন, বা অনুমোদিত কর্মকর্তার কাছে পথের সিদ্ধান্তে পাঠান।`],
  [/^(\d+) referrals were returned\. An authorised human must decide the route; the system does not decide jurisdiction\.$/, (count) => `${num(count)}টি রেফারেল ফেরত এসেছে। অনুমোদিত একজন মানুষকে পথ ঠিক করতে হবে; সিস্টেম এখতিয়ার ঠিক করে না।`],
  [/^(\S+) to acknowledge referral$/, (office) => `${office}-কে রেফারেলের প্রাপ্তি স্বীকার করতে হবে`],
  [/^Recorded case category: (\w+) \((\w+)\)\.$/, (category, source) => `লেখা মামলার ধরন: ${say(category)} (${say(source)})।`],
  [/^A current safety\.urgent fact is marked YES \((\w+)\); a human must assess it\.$/, (source) => `বর্তমান জরুরি বিপদের তথ্য "হ্যাঁ" (${say(source)}); একজন মানুষকে যাচাই করতে হবে।`],
  [/^(.+) \((Hello, .+)\)$/, (bn, en) => bi(en, bn)],
]
const translateOne = (text) => {
  if (phrases[text]) return phrases[text]
  for (const [pattern, render] of templates) { const match = text.match(pattern); if (match) return render(...match.slice(1)) }
  return null
}
// In Bangla, known server sentences are translated one sentence at a time; anything unknown (typed by a person) stays as written.
export function tr(text) {
  if (typeof text !== 'string' || language !== 'bn') return text
  return translateOne(text) ?? text.split(/(?<=\.)\s+(?=[A-Z])/).map((part) => translateOne(part) ?? part).join(' ')
}

export function Bi({ en, bn }) {
  return bi(en, bn)
}

export function Term({ code }) {
  return say(code)
}

const good = new Set(['ACCEPTED', 'DONE', 'APPROVED', 'READABLE', 'GRANTED', 'VERIFIED', 'APPLICANT_REACHED', 'SUBMITTED_ON_TIME', 'RECONCILED', 'PAYMENT_RECORDED', 'CERTIFIED_FINAL', 'COMPLETED', 'REVIEWED', 'LIFTED', 'AGREEMENT_REACHED', 'NOT_DUPLICATE'])
const bad = new Set(['UNREADABLE', 'DENIED', 'MISSED', 'RETURNED', 'DISPUTED', 'URGENT', 'BLOCKED_UNSAFE', 'UNKNOWN_PERSON', 'RESTRICTED', 'DIFFERENT', 'DECLINED', 'SUBMITTED_LATE', 'NO_AGREEMENT', 'ABSENT', 'HIGH', 'SAFETY_REVIEW', 'URGENT_REVIEW'])
export function Badge({ code }) {
  return <span className={`badge${good.has(code) ? '' : bad.has(code) ? ' warn-badge' : ' wait-badge'}`}><Term code={code} /></span>
}

// One collapsible case section. It opens itself the first time it needs attention, then never snaps shut after an action.
export function Panel({ id, en, bn, hint, open = false, children }) {
  const [opened, setOpened] = useState(open)
  if (open && !opened) setOpened(true)
  return <section className="panel" aria-labelledby={id}>
    <details open={opened}>
      <summary><h2 id={id}><Bi en={en} bn={bn} /></h2>{hint ? <span className="panel-hint">{hint}</span> : null}</summary>
      <div className="panel-body">{children}</div>
    </details>
  </section>
}

// A creation form stays folded until the officer asks for it.
export function AddForm({ en, bn, children }) {
  return <details className="add-form"><summary><Bi en={en} bn={bn} /></summary>{children}</details>
}
