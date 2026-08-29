import Category from "@/models/Category";
import Region from "@/models/Region";
import User from "@/models/User";
import Applicant from "@/models/Applicant";
import Announcement from "@/models/Announcement";
import { ROLES } from "./constants";

const defaultCategories = [
  {
    title: "منتقل شده‌ام و متقاضی تغییر مقصد هستم",
    description: "در صورت انتخاب این مورد، منطقه مقصد پیشنهادی خود را مشخص کنید.",
    showDistricts: true,
    selectionType: "none",
    order: 1,
  },
  {
    title: "منتقل شده‌ام و اطلاعات پرسنلی من نیازمند اصلاح می‌باشد",
    description: "موارد نیازمند اصلاح را انتخاب کنید.",
    showDistricts: false,
    selectionType: "checklist",
    order: 2,
    children: ["مبدا", "رشته استخدام", "جنسیت", "امتیازات", "سایر"],
  },
  {
    title: "منتقل نشده‌ام و متقاضی بررسی فرایند انتقال خود هستم",
    description: "درخواست بررسی فرآیند انتقال ثبت می‌شود.",
    showDistricts: false,
    selectionType: "none",
    order: 3,
  },
  {
    title: "منتقل نشده‌ام و اطلاعات اصلی من نیازمند اصلاح می‌باشد",
    description: "موارد نیازمند اصلاح را انتخاب کنید.",
    showDistricts: false,
    selectionType: "checklist",
    order: 4,
    children: ["مبدا", "رشته استخدام", "جنسیت", "امتیازات", "سایر"],
  },
  {
    title: "قبلاً در فرایند ثبت‌نام نکرده‌ام",
    description: "در صورتی که در سامانه مای‌مدیو ثبت‌نام نداشته‌اید این گزینه را انتخاب کنید.",
    showDistricts: false,
    selectionType: "none",
    order: 5,
  },
];

const sampleRegions = [
  ["17", "1701", "مشهد ناحیه یک"],
  ["17", "1702", "مشهد ناحیه دو"],
  ["17", "1703", "مشهد ناحیه سه"],
  ["17", "1704", "مشهد ناحیه چهار"],
  ["17", "1705", "مشهد ناحیه پنج"],
  ["17", "1706", "مشهد ناحیه شش"],
  ["17", "1707", "مشهد ناحیه هفت"],
  ["17", "1710", "طرقبه شاندیز"],
  ["17", "1711", "چناران"],
  ["17", "1712", "قوچان"],
  ["17", "1715", "نیشابور"],
  ["17", "1720", "سبزوار"],
  ["17", "1725", "تربت حیدریه"],
  ["17", "1730", "کاشمر"],
  ["17", "1735", "گناباد"],
  ["17", "1740", "خواف"],
  ["17", "1745", "تایباد"],
  ["17", "1750", "سرخس"],
  ["17", "1755", "کلات"],
  ["17", "1760", "درگز"],
];

const sampleUsers = [
  {
    mobile: "09100000000",
    personnelCode: "ADMIN01",
    fullName: "مدیر سیستم",
    roles: [ROLES.admin],
  },
  {
    mobile: "09111111111",
    personnelCode: "1001001",
    fullName: "نمونه پرسنل",
    roles: [ROLES.personnel],
    districtCode: "1701",
  },
  {
    mobile: "09122222222",
    personnelCode: "2002002",
    fullName: "کارشناس انتقالات استان",
    roles: [ROLES.province_transfer],
  },
  {
    mobile: "09133333333",
    personnelCode: "3003003",
    fullName: "کارشناس انتقالات منطقه مشهد یک",
    roles: [ROLES.district_transfer],
    districtCode: "1701",
  },
  {
    mobile: "09144444444",
    personnelCode: "4004004",
    fullName: "کارشناس طرح و برنامه استان",
    roles: [ROLES.province_planning],
  },
  {
    mobile: "09155555555",
    personnelCode: "5005005",
    fullName: "مدیر منابع انسانی استان",
    roles: [ROLES.hr_manager],
  },
  {
    mobile: "09166666666",
    personnelCode: "6006006",
    fullName: "مدیر کل استان",
    roles: [ROLES.director_general],
  },
  {
    mobile: "09177777777",
    personnelCode: "7007007",
    fullName: "کاربر دو نقش",
    roles: [ROLES.personnel, ROLES.province_planning],
    districtCode: "1702",
  },
];

export async function seedIfEmpty() {
  const count = await User.countDocuments();
  if (count > 0) return { seeded: false };

  for (const r of sampleRegions) {
    await Region.create({
      provinceCode: r[0],
      districtCode: r[1],
      districtName: r[2],
    });
  }

  for (const c of defaultCategories) {
    const parent = await Category.create({
      title: c.title,
      description: c.description,
      showDistricts: c.showDistricts,
      selectionType: c.selectionType,
      order: c.order,
      transferType: "نقل و انتقال",
    });
    if (c.children) {
      for (let i = 0; i < c.children.length; i++) {
        await Category.create({
          title: c.children[i],
          parentId: parent._id,
          selectionType: "none",
          order: i + 1,
        });
      }
    }
  }

  for (const u of sampleUsers) {
    await User.create({ ...u, provinceCode: "17", isActive: true });
  }

  await Applicant.create({
    academicYear: "1405-1406",
    personnelCode: "1001001",
    firstName: "علی",
    lastName: "محمدی",
    mobile: "09111111111",
    employmentType: "رسمی",
    gender: "مرد",
    maritalStatus: "متاهل",
    childrenCount: "2",
    civilRegistryStatus: "ایرانی",
    serviceDistrict: "مشهد ناحیه یک",
    originProvince: "خراسان رضوی",
    originDistrict: "مشهد ناحیه یک",
    districtCode: "1701",
    type: "درون استانی",
    transferType: "ضرورت خدمت",
    category: "1",
    categoryTitle: "متقاضی انتقال",
    yearsOfService: "12",
    educationLevel: "متوسطه دوم",
    employmentPosition: "آموزگار",
    employmentField: "ریاضی",
    status: "منتقل شده",
    finalStatus: "منتقل به مقصد",
    trackingCode: "MEDU-1001001",
    destProvince: "خراسان رضوی",
    destDistrict: "نیشابور",
    destCode: "1715",
    earnedScore: "85",
    approvedScore: "80",
  });

  await Applicant.create({
    academicYear: "1405-1406",
    personnelCode: "7007007",
    firstName: "زهرا",
    lastName: "حسینی",
    mobile: "09177777777",
    employmentType: "پیمانی",
    gender: "زن",
    maritalStatus: "مجرد",
    childrenCount: "0",
    originProvince: "خراسان رضوی",
    originDistrict: "مشهد ناحیه دو",
    districtCode: "1702",
    type: "درون استانی",
    transferType: "عادی",
    categoryTitle: "متقاضی انتقال",
    yearsOfService: "4",
    educationLevel: "ابتدایی",
    employmentPosition: "آموزگار",
    employmentField: "علوم تجربی",
    status: "منتقل نشده",
    finalStatus: "عدم انتقال",
    destProvince: "",
    destDistrict: "",
    destCode: "",
  });

  await Announcement.create({
    title: "آغاز به‌کار سامانه رصد درخواست‌های انتقال",
    body: "همکاران گرامی می‌توانند پس از ورود با شماره همراه، نسبت به ثبت درخواست رسیدگی اقدام نمایند. مهلت بارگذاری مستندات حداکثر ۴ فایل تصویری و هر فایل تا ۵ مگابایت است.",
    isActive: true,
  });

  return { seeded: true };
}

export async function ensureDefaultCategories() {
  const n = await Category.countDocuments();
  if (n > 0) return;
  for (const c of defaultCategories) {
    const parent = await Category.create({
      title: c.title,
      description: c.description,
      showDistricts: c.showDistricts,
      selectionType: c.selectionType,
      order: c.order,
    });
    if (c.children) {
      for (let i = 0; i < c.children.length; i++) {
        await Category.create({
          title: c.children[i],
          parentId: parent._id,
          order: i + 1,
        });
      }
    }
  }
}
