import type {
  DatewiseAttendanceBucket,
  ScheduleEntry,
  StudentDetails,
} from "../types/kiet";
import type { ExamSession, HallTicketOption } from "../types/bridge";
import { callExtension } from "../utils/bridge";

const AES_KEY_BASE64 = "NPdLWA5w7yFQhPeUuKmO/A==";
const AES_IV_BASE64 = "bV5V6nK4phvQG9ZhkAjugQ==";

const STORAGE_KEYS = {
  TOKEN: "cybervidya_authToken",
  STUDENT_ID: "cybervidya_studentId",
  SESSION_ID: "cybervidya_sessionId",
  CAPTURED_AT: "cybervidya_capturedAt",
};

const API_BASES = ["/api/cybervidya", "https://cybervidya.amanpal.tech/api"];

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function encryptAES128CBC(text: string): Promise<string> {
  const keyBytes = base64ToUint8Array(AES_KEY_BASE64);
  const ivBytes = base64ToUint8Array(AES_IV_BASE64);

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const encoder = new TextEncoder();
  const plainTextBytes = encoder.encode(text);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: ivBytes.buffer as ArrayBuffer },
    cryptoKey,
    plainTextBytes
  );

  return uint8ArrayToBase64(new Uint8Array(encryptedBuffer));
}

export function sanitizeToken(token: string): string {
  if (!token) return "";
  const cleaned = token.trim().replace(/^"|"$/g, "");
  if (/^GlobalEducation\s+/i.test(cleaned)) {
    return cleaned;
  }
  return `GlobalEducation ${cleaned}`;
}

export function extractClaimsFromToken(token: string): { studentId?: string | number; sessionId?: string | number } | null {
  try {
    const raw = token.replace(/^GlobalEducation\s+/i, "").replace(/^Bearer\s+/i, "").trim();
    const parts = raw.split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(payloadBase64));
      const studentId = json.studentId || json.userId || json.uid || json.id || json.sub;
      const sessionId = json.sessionId;
      return {
        studentId: studentId && !isNaN(Number(studentId)) ? Number(studentId) : studentId,
        sessionId: sessionId && !isNaN(Number(sessionId)) ? Number(sessionId) : sessionId,
      };
    }
  } catch {
    // Ignore JWT decode failure
  }
  return null;
}

export function getStoredSession() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const capturedAt = localStorage.getItem(STORAGE_KEYS.CAPTURED_AT);
  const studentId = localStorage.getItem(STORAGE_KEYS.STUDENT_ID);
  const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);

  return {
    hasToken: Boolean(token),
    token: token ? sanitizeToken(token) : null,
    capturedAt: capturedAt ? parseInt(capturedAt, 10) : null,
    studentId: studentId ? (isNaN(Number(studentId)) ? studentId : Number(studentId)) : null,
    sessionId: sessionId ? (isNaN(Number(sessionId)) ? sessionId : Number(sessionId)) : null,
  };
}

export function saveStoredToken(rawToken: string, studentId?: string | number | null, sessionId?: string | number | null) {
  const token = sanitizeToken(rawToken);
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.CAPTURED_AT, String(Date.now()));
  if (studentId !== undefined && studentId !== null) {
    localStorage.setItem(STORAGE_KEYS.STUDENT_ID, String(studentId));
  }
  if (sessionId !== undefined && sessionId !== null) {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, String(sessionId));
  }
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.CAPTURED_AT);
  localStorage.removeItem(STORAGE_KEYS.STUDENT_ID);
  localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
}

async function requestApi<T>(
  pathname: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string>; _isInternalLookup?: boolean } = {}
): Promise<T> {
  let session = getStoredSession();
  const isAuthRoute = pathname.startsWith("/auth/");

  // Automatic UID resolution if session token exists but studentId is not yet in storage
  if (
    session.token &&
    !session.studentId &&
    !options._isInternalLookup &&
    !isAuthRoute &&
    pathname !== "/student/dashboard/registered-courses"
  ) {
    try {
      const infoRes = await requestApi<{ data: Array<{ studentId?: number | string; sessionId?: number | string }> }>(
        "/student/dashboard/registered-courses",
        { _isInternalLookup: true }
      );
      const courseList = Array.isArray(infoRes?.data)
        ? infoRes.data
        : Array.isArray(infoRes)
        ? (infoRes as unknown as Array<{ studentId?: number | string; sessionId?: number | string }>)
        : Array.isArray((infoRes as any)?.payload)
        ? (infoRes as any).payload
        : [];
      const first = courseList[0] || null;
      if (first?.studentId) {
        saveStoredToken(session.token, first.studentId, first.sessionId);
        session = getStoredSession();
      }
    } catch (e) {
      console.warn("Failed automatic studentId resolution:", e);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // NEVER attach Authorization or UID headers to unauthenticated /auth/ endpoints
  if (!isAuthRoute) {
    if (session.token) {
      headers["Authorization"] = session.token;
    }
    if (session.studentId && !headers["UID"]) {
      headers["UID"] = String(session.studentId);
    }
  }

  let lastResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let i = 0; i < API_BASES.length; i++) {
    const base = API_BASES[i];
    try {
      const response = await fetch(`${base}${pathname}`, {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(25000),
      });

      lastResponse = response;

      // If the first endpoint returns 403 or server gateway errors, fall back to next base
      if ((response.status === 403 || response.status >= 502) && i < API_BASES.length - 1) {
        console.warn(`Endpoint ${base} returned ${response.status}, falling back to ${API_BASES[i + 1]}...`);
        continue;
      }

      if (response.status === 401) {
        clearStoredSession();
        throw new Error("Your KIET session expired. Please log in again.");
      }

      if (response.status === 500) {
        throw new Error(
          "CyberVidya server error (500). CyberVidya's servers are temporarily experiencing issues. Please try again in a few moments."
        );
      }

      if (!response.ok) {
        let errorMsg = `CyberVidya error (${response.status})`;
        try {
          const text = await response.text();
          try {
            const jsonErr = JSON.parse(text);
            if (jsonErr?.error?.reason) {
              errorMsg = jsonErr.error.reason;
            } else if (jsonErr?.message) {
              errorMsg = jsonErr.message;
            } else if (jsonErr?.error) {
              errorMsg = typeof jsonErr.error === "string" ? jsonErr.error : JSON.stringify(jsonErr.error);
            }
          } catch {
            if (text && text.trim()) {
              errorMsg = text.slice(0, 160);
            }
          }
        } catch {
          // fallback to status code errorMsg
        }
        throw new Error(errorMsg);
      }

      return (await response.json()) as Promise<T>;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < API_BASES.length - 1 && !(err instanceof Error && err.message.includes("KIET session expired"))) {
        console.warn(`Failed request on ${base}, attempting fallback to ${API_BASES[i + 1]}:`, err);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error("Failed to connect to CyberVidya");
}

export interface LoginResult {
  ok: boolean;
  requiresOtp?: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

export async function loginDirect(username: string, pass: string): Promise<LoginResult> {
  try {
    // Clear any previous stale session credentials first
    clearStoredSession();

    const encryptedUserName = await encryptAES128CBC(username.trim());
    const encryptedPassword = await encryptAES128CBC(pass.trim());

    const res = await requestApi<any>("/auth/encrypt/login", {
      method: "POST",
      body: {
        userName: encryptedUserName,
        password: encryptedPassword,
        device: "WEB",
        version: null,
        reCaptchaToken: null,
      },
    });

    const dataObj = res?.data || res;
    const transactionId =
      dataObj?.transactionId ||
      dataObj?.transaction_id ||
      dataObj?.txId ||
      res?.transactionId;

    if (transactionId) {
      return {
        ok: false,
        requiresOtp: true,
        transactionId: String(transactionId),
        message: dataObj?.message || res?.message || "OTP sent to your registered mobile/email",
      };
    }

    const token =
      dataObj?.token ||
      dataObj?.id_token ||
      res?.token ||
      res?.id_token ||
      (typeof dataObj === "string" && dataObj.length > 20 ? dataObj : null);

    const claims = token ? extractClaimsFromToken(token) : null;

    const studentId =
      dataObj?.studentId ||
      dataObj?.userId ||
      dataObj?.id ||
      res?.studentId ||
      res?.userId ||
      claims?.studentId ||
      null;

    const sessionId =
      dataObj?.sessionId ||
      res?.sessionId ||
      claims?.sessionId ||
      null;

    if (token) {
      saveStoredToken(token, studentId, sessionId);
      return { ok: true };
    }

    return { ok: false, error: "Login failed: No authentication token returned." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function verifyOtpDirect(transactionId: string, otp: string): Promise<LoginResult> {
  try {
    const res = await requestApi<any>("/auth/verify/otp", {
      method: "POST",
      body: {
        otp: otp.trim(),
        transactionId,
        device: "WEB",
        version: null,
      },
    });

    const dataObj = res?.data || res;
    const token =
      dataObj?.token ||
      dataObj?.id_token ||
      res?.token ||
      res?.id_token ||
      (typeof dataObj === "string" && dataObj.length > 20 ? dataObj : null);

    const claims = token ? extractClaimsFromToken(token) : null;

    const studentId =
      dataObj?.studentId ||
      dataObj?.userId ||
      dataObj?.id ||
      res?.studentId ||
      res?.userId ||
      claims?.studentId ||
      null;

    const sessionId =
      dataObj?.sessionId ||
      res?.sessionId ||
      claims?.sessionId ||
      null;

    if (token) {
      saveStoredToken(token, studentId, sessionId);
      return { ok: true };
    }

    return { ok: false, error: "OTP verification failed: Token not received." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchAttendanceDirect(): Promise<StudentDetails> {
  const res = await requestApi<{ data: StudentDetails }>("/attendance/course/component/student");
  return res.data;
}

export async function fetchStudentIdDirect(): Promise<{ studentId: number | string | null; sessionId: number | string | null }> {
  try {
    const res = await requestApi<{ data: Array<{ studentId?: number | string; sessionId?: number | string }> }>(
      "/student/dashboard/registered-courses"
    );
    const rawList = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? (res as unknown as Array<{ studentId?: number | string; sessionId?: number | string }>)
      : Array.isArray((res as any)?.payload)
      ? (res as any).payload
      : [];
    const first = rawList[0] || null;
    const studentId = first?.studentId ?? null;
    const sessionId = first?.sessionId ?? null;

    const stored = getStoredSession();
    const effectiveStudentId = studentId ?? stored.studentId ?? null;
    const effectiveSessionId = sessionId ?? stored.sessionId ?? null;

    if (effectiveStudentId || effectiveSessionId) {
      saveStoredToken(localStorage.getItem(STORAGE_KEYS.TOKEN) || "", effectiveStudentId, effectiveSessionId);
    }

    return { studentId: effectiveStudentId, sessionId: effectiveSessionId };
  } catch (err) {
    const stored = getStoredSession();
    if (stored.studentId) {
      return { studentId: stored.studentId, sessionId: stored.sessionId };
    }
    throw err;
  }
}

export async function fetchScheduleDirect(weekStartDate: string, weekEndDate: string): Promise<ScheduleEntry[]> {
  const params = new URLSearchParams({ weekStartDate, weekEndDate });
  const res = await requestApi<{ data: ScheduleEntry[] }>(`/student/schedule/class?${params.toString()}`);
  return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? (res as unknown as ScheduleEntry[]) : [];
}

export async function fetchDatewiseAttendanceDirect(
  studentId: number | string,
  sessionId: number | string | null,
  courseId: number,
  courseCompId: number,
  forceRefresh = false
): Promise<DatewiseAttendanceBucket[]> {
  const session = getStoredSession();
  const effectiveStudentId = studentId || session.studentId;
  const effectiveSessionId = sessionId ?? session.sessionId ?? null;

  const cacheKey = `kiet_datewise_${effectiveStudentId}_${courseId}_${courseCompId}`;
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cachedList: DatewiseAttendanceBucket[] = Array.isArray(parsed?.data)
          ? parsed.data
          : Array.isArray(parsed)
          ? parsed
          : [];
        if (
          parsed &&
          typeof parsed.timestamp === "number" &&
          Date.now() - parsed.timestamp < 3 * 60 * 60 * 1000
        ) {
          return cachedList;
        }
      }
    } catch {
      // Ignore cache read failures
    }
  }

  const res = await requestApi<{ data: DatewiseAttendanceBucket[] }>(
    "/attendance/schedule/student/course/attendance/percentage",
    {
      method: "POST",
      headers: effectiveStudentId ? { UID: String(effectiveStudentId) } : {},
      body: {
        studentId: effectiveStudentId !== null && effectiveStudentId !== undefined && !isNaN(Number(effectiveStudentId))
          ? Number(effectiveStudentId)
          : effectiveStudentId,
        sessionId: effectiveSessionId !== null && effectiveSessionId !== undefined && !isNaN(Number(effectiveSessionId))
          ? Number(effectiveSessionId)
          : effectiveSessionId,
        courseId: Number(courseId) || courseId,
        courseCompId: Number(courseCompId) || courseCompId,
      },
    }
  );

  const dataList: DatewiseAttendanceBucket[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
    ? (res as unknown as DatewiseAttendanceBucket[])
    : Array.isArray((res as any)?.payload)
    ? (res as any).payload
    : [];

  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ timestamp: Date.now(), data: dataList })
    );
  } catch {
    // Ignore storage quota limits
  }

  return dataList;
}

export async function fetchExamSessionsDirect(studentId: number | string): Promise<ExamSession[]> {
  const res = await requestApi<{ data: ExamSession[] }>(
    `/exam/form/session/config/getById/student/${studentId}`
  );
  return res.data || [];
}

export async function fetchHallTicketOptionsDirect(sessionId: number | string): Promise<HallTicketOption[]> {
  const res = await requestApi<{ data: HallTicketOption[] }>(
    `/exam/hall-ticket/student/download/options/${sessionId}`
  );
  return res.data || [];
}

export async function downloadHallTicketPdfDirect(
  hallTicketId: number | string,
  studentId?: number | string | null
): Promise<Blob> {
  let session = getStoredSession();
  let uid = studentId ?? session.studentId;

  // Auto-resolve studentId if session token exists but studentId is missing
  if (session.token && !uid) {
    try {
      const infoRes = await requestApi<{ data: Array<{ studentId?: number | string; sessionId?: number | string }> }>(
        "/student/dashboard/registered-courses",
        { _isInternalLookup: true }
      );
      const first = Array.isArray(infoRes?.data) ? infoRes.data[0] : null;
      if (first?.studentId) {
        saveStoredToken(session.token, first.studentId, first.sessionId);
        session = getStoredSession();
        uid = first.studentId;
      }
    } catch (e) {
      console.warn("Failed automatic studentId resolution in PDF download:", e);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/pdf, application/octet-stream, */*",
  };

  if (session.token) {
    headers["Authorization"] = session.token;
  }
  if (uid) {
    headers["UID"] = String(uid);
  }

  for (let i = 0; i < API_BASES.length; i++) {
    const base = API_BASES[i];
    try {
      const response = await fetch(`${base}/report/pdf/exam/student/hall-ticket/download/${hallTicketId}`, {
        method: "GET",
        headers,
      });

      if (response.status === 403 && i < API_BASES.length - 1) {
        continue;
      }
      if (response.status === 401) {
        throw new Error("CyberVidya session expired or Unauthorized (HTTP 401). Please re-login to CyberVidya.");
      }
      if (!response.ok) {
        throw new Error(`Failed to download Hall Ticket PDF (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      return new Blob([blob], { type: "application/pdf" });
    } catch (err) {
      if (i < API_BASES.length - 1) continue;
      throw err;
    }
  }

  throw new Error("Failed to download Hall Ticket PDF");
}

/* Unified Handlers (Check Direct API first, Fallback to Extension if needed) */

export async function getSessionStatusUnified(): Promise<{ hasToken: boolean; capturedAt: number | null }> {
  const directSession = getStoredSession();
  if (directSession.hasToken) {
    return {
      hasToken: true,
      capturedAt: directSession.capturedAt,
    };
  }

  try {
    const extSession = await callExtension("GET_SESSION_STATUS", {});
    return {
      hasToken: extSession.hasToken,
      capturedAt: extSession.capturedAt,
    };
  } catch {
    return { hasToken: false, capturedAt: null };
  }
}

export async function fetchAttendanceUnified(): Promise<StudentDetails> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchAttendanceDirect();
  }
  return callExtension("FETCH_ATTENDANCE", {});
}

export async function fetchStudentIdUnified(): Promise<{ studentId: number | string | null; sessionId: number | string | null }> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchStudentIdDirect();
  }
  return callExtension("FETCH_STUDENT_ID", {});
}

export async function fetchScheduleUnified(range: { weekStartDate: string; weekEndDate: string }): Promise<ScheduleEntry[]> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchScheduleDirect(range.weekStartDate, range.weekEndDate);
  }
  return callExtension("FETCH_SCHEDULE", range);
}

export async function fetchDatewiseAttendanceUnified(params: {
  studentId: number | string;
  sessionId: number | string | null;
  courseId: number;
  courseCompId: number;
  forceRefresh?: boolean;
}): Promise<DatewiseAttendanceBucket[]> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchDatewiseAttendanceDirect(
      params.studentId,
      params.sessionId,
      params.courseId,
      params.courseCompId,
      Boolean(params.forceRefresh)
    );
  }
  return callExtension("FETCH_DATEWISE_ATTENDANCE", params);
}

export async function fetchExamSessionsUnified(studentId: number | string): Promise<ExamSession[]> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchExamSessionsDirect(studentId);
  }
  return callExtension("FETCH_EXAM_SESSIONS", { studentId });
}

export async function fetchHallTicketOptionsUnified(sessionId: number | string): Promise<HallTicketOption[]> {
  const session = getStoredSession();
  if (session.hasToken) {
    return fetchHallTicketOptionsDirect(sessionId);
  }
  return callExtension("FETCH_HALL_TICKET_OPTIONS", { sessionId });
}

export async function downloadHallTicketPdfUnified(
  hallTicketId: number | string,
  studentId?: number | string | null
): Promise<Blob> {
  return downloadHallTicketPdfDirect(hallTicketId, studentId);
}

export async function clearSessionUnified() {
  clearStoredSession();
  try {
    await callExtension("CLEAR_SESSION", {});
  } catch {
    // Ignore error if extension is not present
  }
}
