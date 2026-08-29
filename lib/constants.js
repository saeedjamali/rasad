export const ROLES = {
  personnel: "personnel",
  province_transfer: "province_transfer",
  district_transfer: "district_transfer",
  province_planning: "province_planning",
  hr_manager: "hr_manager",
  director_general: "director_general",
  admin: "admin",
};

export const ROLE_LABELS = {
  personnel: "پرسنل",
  province_transfer: "کارشناس انتقالات استان",
  district_transfer: "کارشناس انتقالات منطقه",
  province_planning: "کارشناس طرح و برنامه استان",
  hr_manager: "مدیر منابع انسانی استان",
  director_general: "مدیر کل استان",
  admin: "مدیر سیستم",
};

export const ROLE_FROM_FA = Object.fromEntries(
  Object.entries(ROLE_LABELS).map(([k, v]) => [v, k])
);

export const STATUSES = {
  WAITING_PROVINCE_REVIEW: "WAITING_PROVINCE_REVIEW",
  IN_REVIEW_PROVINCE: "IN_REVIEW_PROVINCE",
  INQUIRY_DISTRICT: "INQUIRY_DISTRICT",
  INQUIRY_PLANNING: "INQUIRY_PLANNING",
  INQUIRY_RESPONSE_WAITING_PROVINCE: "INQUIRY_RESPONSE_WAITING_PROVINCE",
  REVIEW_RESULT: "REVIEW_RESULT",
  RETURNED_TO_USER: "RETURNED_TO_USER",
};

export const STATUS_LABELS = {
  WAITING_PROVINCE_REVIEW: "در انتظار بررسی کارشناس نقل و انتقال استان",
  IN_REVIEW_PROVINCE: "در حال بررسی توسط کارشناس نقل و انتقال استان",
  INQUIRY_DISTRICT: "استعلام از منطقه",
  INQUIRY_PLANNING: "استعلام از طرح و برنامه استان",
  INQUIRY_RESPONSE_WAITING_PROVINCE: "پاسخ به استعلام استان – در انتظار بررسی استان",
  REVIEW_RESULT: "بررسی نهایی",
  RETURNED_TO_USER: "بازگشت به کاربر",
  APPROVED: "تایید درخواست",
  REJECTED: "رد درخواست",
};

export const STATUS_USER_LABELS = {
  WAITING_PROVINCE_REVIEW: "در انتظار بررسی در استان",
  IN_REVIEW_PROVINCE: "در حال بررسی در استان",
  INQUIRY_DISTRICT: "استعلام از منطقه",
  INQUIRY_PLANNING: "استعلام از استان",
  INQUIRY_RESPONSE_WAITING_PROVINCE: "پاسخ به استعلام استان – در انتظار بررسی استان",
  REVIEW_RESULT: "بررسی نهایی",
  RETURNED_TO_USER: "بازگشت به کاربر",
};

export const RESULT_LABELS = {
  approved: "تایید درخواست",
  rejected: "رد درخواست",
  agree: "موافقت",
  disagree: "مخالفت",
};

export const ACTION_LABELS = {
  create: "ثبت درخواست",
  edit: "ویرایش درخواست",
  enter: "شروع بررسی استان",
  comment: "ثبت توضیحات",
  approve: "تایید درخواست",
  reject: "رد درخواست",
  return: "بازگشت به کاربر",
  user_reply: "پاسخ کاربر",
  inquiry_planning: "استعلام از طرح و برنامه استان",
  inquiry_district: "استعلام از منطقه",
  inquiry_district_note: "شرح استعلام برای منطقه",
  district_user_note: "پاسخ منطقه برای کاربر",
  district_province_note: "توضیح منطقه برای استان",
  district_send: "ارسال پاسخ منطقه به استان",
  planning_opinion: "اعلام نظر طرح و برنامه استان",
  admin_set_status: "تغییر وضعیت توسط مدیر سیستم",
  login_otp: "ورود با پیامک",
  login_password: "ورود با رمز عبور",
  password_set: "تعیین رمز عبور",
  user_create: "ایجاد کاربر",
  user_update: "ویرایش کاربر",
  user_delete: "حذف کاربر",
  user_import: "ورود اکسل کاربران",
  applicant_create: "ثبت متقاضی",
  applicant_update: "ویرایش متقاضی",
  applicant_delete: "حذف متقاضی",
  applicant_import: "ورود اکسل متقاضیان",
  personnel_create: "ثبت پرسنل",
  personnel_update: "ویرایش پرسنل",
  personnel_delete: "حذف پرسنل",
  personnel_import: "ورود اکسل پرسنل",
  request_create: "ثبت درخواست",
  request_admin_set_status: "تغییر وضعیت درخواست توسط مدیر سیستم",
  request_approve: "تایید درخواست",
  request_reject: "رد درخواست",
  request_return: "بازگشت به کاربر",
  request_comment: "ثبت توضیحات",
  request_enter: "شروع بررسی استان",
  request_inquiry_planning: "استعلام از طرح و برنامه استان",
  request_inquiry_district: "استعلام از منطقه",
  request_user_reply: "پاسخ کاربر",
  request_district_send: "ارسال پاسخ منطقه به استان",
  request_planning_opinion: "اعلام نظر طرح و برنامه استان",
  settings_update: "ویرایش تنظیمات سامانه",
};

export const ENTITY_LABELS = {
  User: "کاربر",
  Applicant: "متقاضی",
  Personnel: "پرسنل",
  Request: "درخواست",
  Setting: "تنظیمات",
};

export const APPLICANT_FIELDS = [
  ["academicYear", "سال تحصیلی"],
  ["personnelCode", "کد پرسنلی"],
  ["firstName", "نام"],
  ["lastName", "نام خانوادگی"],
  ["mobile", "شماره همراه"],
  ["employmentType", "نوع استخدام"],
  ["gender", "جنسیت"],
  ["maritalStatus", "وضعیت تاهل"],
  ["childrenCount", "تعداد فرزندان"],
  ["civilRegistryStatus", "وضعیت ثبت احوال"],
  ["serviceDistrict", "منطقه محل خدمت"],
  ["originProvince", "استان مبدا"],
  ["originDistrict", "منطقه مبدا"],
  ["districtCode", "کد منطقه"],
  ["type", "نوع"],
  ["transferType", "نوع انتقال"],
  ["category", "دسته بندی"],
  ["categoryTitle", "عنوان دسته بندی"],
  ["processCode", "کد پردازش"],
  ["algorithmCode", "کد الگوریتم"],
  ["processResult", "نتیجه پردازش"],
  ["cartableOrProcess", "کارتابلی/پردازشی"],
  ["yearsOfService", "سنوات"],
  ["educationLevel", "دوره تحصیلی"],
  ["employmentPosition", "سمت استخدامی"],
  ["employmentField", "رشته استخدامی"],
  ["spousePersonnelCode", "کد پرسنلی همسر"],
  ["status", "وضعیت"],
  ["finalStatus", "وضعیت نهایی"],
  ["trackingCode", "کد پیگیری"],
  ["destProvince", "استان مقصد"],
  ["destDistrict", "منطقه مقصد"],
  ["destCode", "کد مقصد"],
  ["earnedScore", "امتیاز کسب شده"],
  ["approvedScore", "امتیاز تایید شده"],
  ["registeredAt", "تاریخ ثبت"],
  ["eventDate", "تاریخ رویداد"],
  ["editedAt", "تاریخ ویرایش"],
  ["user", "کاربر"],
  ["startDate", "تاریخ شروع"],
  ["endDate", "تاریخ پایان"],
];

export const PERSONNEL_MAIN_FIELDS = [
  "personnelCode",
  "firstName",
  "lastName",
  "mobile",
  "serviceDistrict",
  "originDistrict",
  "destDistrict",
  "status",
];

export const PERSONNEL_VISIBLE_FIELDS = [
  "personnelCode",
  "firstName",
  "lastName",
  "mobile",
  "serviceDistrict",
  "employmentType",
  "gender",
  "maritalStatus",
  "childrenCount",
  "originProvince",
  "originDistrict",
  "districtCode",
  "type",
  "transferType",
  "categoryTitle",
  "yearsOfService",
  "educationLevel",
  "employmentPosition",
  "employmentField",
  "status",
  "finalStatus",
  "destProvince",
  "destDistrict",
  "destCode",
];

export const DEFAULT_ACADEMIC_YEAR = "1405-1406";
export const DEFAULT_APPLICANT_STATUS = "ثبت نام جدید";

export const APPLICANT_REQUIRED_FIELDS = [
  "personnelCode",
  "firstName",
  "lastName",
  "mobile",
  "serviceDistrict",
  "districtCode",
  "destCode",
];

export const APPLICANT_SELECT_OPTIONS = {
  gender: ["مرد", "زن"],
  maritalStatus: ["مجرد", "متاهل"],
  employmentType: ["رسمی", "پیمانی", "قراردادی", "حق‌التدریس"],
  type: ["درون استانی", "برون استانی"],
  educationLevel: ["ابتدایی", "متوسطه اول", "متوسطه دوم", "هنرستان"],
  civilRegistryStatus: ["ایرانی", "اتباع"],
  cartableOrProcess: ["کارتابلی", "پردازشی"],
  status: ["ثبت نام جدید", "منتقل شده", "منتقل نشده"],
};

export const APPLICANT_EXTRA_GROUPS = [
  {
    title: "مشخصات فردی",
    keys: ["gender", "maritalStatus", "childrenCount", "civilRegistryStatus"],
  },
  {
    title: "اطلاعات استخدامی",
    keys: ["employmentType", "yearsOfService", "educationLevel", "employmentPosition", "employmentField", "spousePersonnelCode"],
  },
  {
    title: "انتقال و پردازش",
    keys: ["academicYear", "type", "transferType", "category", "categoryTitle", "processCode", "algorithmCode", "processResult", "cartableOrProcess", "status", "finalStatus", "trackingCode", "earnedScore", "approvedScore"],
  },
  {
    title: "استان و تاریخ",
    keys: ["originProvince", "destProvince", "registeredAt", "eventDate", "editedAt", "user", "startDate", "endDate"],
  },
];

export function missingApplicantRequired(body) {
  if (!body?.personnelCode) return "کد پرسنلی الزامی است";
  if (!body?.firstName) return "نام الزامی است";
  if (!body?.lastName) return "نام خانوادگی الزامی است";
  if (!body?.mobile) return "شماره همراه الزامی است";
  if (!body?.serviceDistrict) return "منطقه محل خدمت الزامی است";
  if (!body?.districtCode && !body?.originDistrict) return "منطقه مبدا الزامی است";
  if (!body?.destCode && !body?.destDistrict) return "منطقه مقصد الزامی است";
  return "";
}

export function applicantFullName(a) {
  if (!a) return "";
  return [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
}

export const UNKNOWN_USER_MESSAGE =
  "سرویس ویژه انتقالات فعال می‌باشد و با توجه به اینکه شما در هیچ کدام از مراحل نقل و انتقال در سامانه my.medu.ir ثبت نام نداشته‌اید، امکان ورود به سامانه و ثبت درخواست را ندارید.";

export const PERSONNEL_LOGIN_MESSAGE =
  "در این مرحله صرفا پرسنلی که در مراحل اول و دوم در سامانه My.medu.ir درخواست انتقال ایشان ثبت شده، امکان ثبت درخواست خواهند داشت.";

export const LOCKED_USER_MESSAGE = "حساب کاربری شما قفل شده است. با مدیر سیستم تماس بگیرید.";

export const DISABLED_USER_MESSAGE = "حساب کاربری شما غیرفعال شده است. با مدیر سیستم تماس بگیرید.";

export const MAINTENANCE_MESSAGE = "سامانه در حال به‌روزرسانی است. لطفاً کمی بعد مراجعه کنید.";

export const REVIEW_RESULT_USER_MESSAGE =
  "فرایند بررسی شما نهایی شد و نتیجه انتقالات در سامانه مای‌مدیو قابل مشاهده می‌باشد.";

export const FOOTER_TEXT =
  "مالکیت مادی و معنوی این سایت متعلق به اداره کل آموزش و پرورش خراسان رضوی می‌باشد";

export function statusLabel(status, result, forUser = false) {
  if (status === STATUSES.REVIEW_RESULT) {
    if (forUser) return STATUS_USER_LABELS.REVIEW_RESULT;
    if (result) return RESULT_LABELS[result] || STATUS_LABELS.REVIEW_RESULT;
    return STATUS_LABELS.REVIEW_RESULT;
  }
  const map = forUser ? STATUS_USER_LABELS : STATUS_LABELS;
  return map[status] || status;
}

export function trackerLabel(request) {
  const s = request.status;
  if (s === STATUSES.INQUIRY_DISTRICT) {
    return `کارشناس انتقالات منطقه ${request.assignedRegionLabel || request.assignedDistrictName || request.assignedDistrictCode || ""}`.trim();
  }
  if (s === STATUSES.INQUIRY_PLANNING) return ROLE_LABELS.province_planning;
  if (s === STATUSES.RETURNED_TO_USER) return ROLE_LABELS.personnel;
  if (s === STATUSES.REVIEW_RESULT) return "فرایند بسته شده";
  return ROLE_LABELS.province_transfer;
}

export const MENU = [
  { href: "/app", label: "صفحه اصلی", roles: Object.values(ROLES) },
  { href: "/app/request", label: "درخواست من", roles: [ROLES.personnel, ROLES.admin] },
  { href: "/app/applicants", label: "متقاضیان", roles: [ROLES.province_transfer, ROLES.district_transfer, ROLES.admin] },
  { href: "/app/personnel", label: "اطلاعات پرسنل", roles: [ROLES.admin] },
  { href: "/app/requests", label: "درخواست‌ها", roles: [ROLES.province_transfer, ROLES.district_transfer, ROLES.province_planning, ROLES.hr_manager, ROLES.director_general, ROLES.admin] },
  { href: "/app/users", label: "کاربران", roles: [ROLES.admin] },
  { href: "/app/regions", label: "مناطق", roles: [ROLES.admin] },
  { href: "/app/categories", label: "دسته‌بندی‌ها", roles: [ROLES.admin] },
  { href: "/app/announcements", label: "اطلاعیه‌ها", roles: [ROLES.admin] },
  { href: "/app/settings", label: "تنظیمات", roles: [ROLES.admin] },
  { href: "/app/reports", label: "گزارش‌ها", roles: [ROLES.province_transfer, ROLES.hr_manager, ROLES.director_general, ROLES.admin] },
  { href: "/app/logs", label: "لاگ‌ها", roles: [ROLES.admin] },
  { href: "/app/profile", label: "پروفایل", roles: Object.values(ROLES) },
];
