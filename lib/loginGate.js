import User from "@/models/User";
import Applicant from "@/models/Applicant";
import {
  ROLES,
  UNKNOWN_USER_MESSAGE,
  PERSONNEL_LOGIN_MESSAGE,
  LOCKED_USER_MESSAGE,
  DISABLED_USER_MESSAGE,
} from "./constants";

export async function resolveLoginUser(mobile) {
  const user = await User.findOne({ mobile });
  if (!user) {
    return { ok: false, status: 403, message: UNKNOWN_USER_MESSAGE };
  }
  if (!user.isActive) {
    return { ok: false, status: 403, message: DISABLED_USER_MESSAGE };
  }
  if (user.isLocked) {
    return { ok: false, status: 403, message: LOCKED_USER_MESSAGE };
  }

  const roles = Array.from(user.roles || []);
  if (roles.includes(ROLES.personnel)) {
    const applicant = await Applicant.findOne({
      $or: [{ mobile: user.mobile }, { personnelCode: user.personnelCode }],
    });
    if (!applicant) {
      return { ok: false, status: 403, message: PERSONNEL_LOGIN_MESSAGE };
    }
  }

  return { ok: true, user };
}
