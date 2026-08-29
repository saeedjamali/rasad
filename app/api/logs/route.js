import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import AuditLog from "@/models/AuditLog";
import RequestLog from "@/models/RequestLog";
import Request from "@/models/Request";
import { findPaged, parsePaging } from "@/lib/pagination";
import { logSearchFilter, fillActorMobiles } from "@/lib/logging";
import { escapeRegex, toEnglishDigits } from "@/lib/identity";
import User from "@/models/User";

async function buildFilter(type, q) {
  const filter = logSearchFilter(q, type);
  if (q && type === "request") {
    const requests = await Request.find({
      trackingCode: new RegExp(escapeRegex(q), "i"),
    })
      .select("_id")
      .limit(50)
      .lean();
    if (requests.length) {
      filter.$or = [...(filter.$or || []), { requestId: { $in: requests.map((r) => r._id) } }];
    }
  }
  if (q) {
    const actors = await User.find({ mobile: new RegExp(escapeRegex(q), "i") })
      .select("_id")
      .limit(50)
      .lean();
    if (actors.length) {
      filter.$or = [...(filter.$or || []), { actorUserId: { $in: actors.map((u) => u._id) } }];
    }
  }
  return filter;
}

function startOfToday() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${day}T00:00:00+03:30`);
}

async function actionStats(Model, filter) {
  const match = Object.keys(filter).length ? [{ $match: filter }] : [];
  const today = startOfToday();
  const todayFilter = Object.keys(filter).length
    ? { $and: [filter, { createdAt: { $gte: today } }] }
    : { createdAt: { $gte: today } };

  const [byAction, todayCount, unique] = await Promise.all([
    Model.aggregate([
      ...match,
      { $group: { _id: { $ifNull: ["$action", ""] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Model.countDocuments(todayFilter),
    Model.aggregate([
      ...match,
      {
        $group: {
          _id: null,
          codes: { $addToSet: "$actorPersonnelCode" },
        },
      },
    ]),
  ]);

  const codes = (unique[0]?.codes || []).filter(Boolean);
  return {
    today: todayCount,
    users: codes.length,
    byAction: byAction.map((row) => ({ action: row._id || "", count: row.count })),
  };
}

export async function GET(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type") || "audit";
  const q = toEnglishDigits(sp.get("q") || "").trim();
  const paging = parsePaging(sp);
  const Model = type === "request" ? RequestLog : AuditLog;
  const filter = await buildFilter(type, q);
  const [result, stats] = await Promise.all([
    findPaged(Model, filter, { createdAt: -1 }, paging),
    actionStats(Model, filter),
  ]);
  return json({
    ...result,
    list: await fillActorMobiles(result.list),
    stats,
  });
}
