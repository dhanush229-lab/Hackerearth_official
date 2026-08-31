import { API_BASE_URL, ApiError, apiRequest } from "./api";

export type EventStatus = "open" | "full" | "closed" | "ongoing" | "past";

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  venue: string;
  posterUrl: string;
  posterPublicId?: string | null;
  eventDateTime: string;
  eventEndDateTime?: string | null;
  registrationDeadline: string;
  maxRegistrations: number;
  registrationCount: number;
  active: boolean;
  status: EventStatus;
  registrationOpen: boolean;
  isRegistered?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  title: string;
  description: string;
  venue: string;
  posterUrl: string;
  posterPublicId?: string;
  eventDateTime: string;
  eventEndDateTime: string;
  registrationDeadline: string;
  maxRegistrations: number;
  active?: boolean;
}

export interface AdminEventRegistrationStudent {
  id: string;
  name: string;
  usn: string;
  email: string;
  contactNumber: string;
  year: number | null;
  registeredAt: string;
}

export interface AdminEventRegistrationSummary {
  id: string;
  title: string;
  registrationCount: number;
  maxRegistrations: number;
}

interface StudentEventsResponse {
  success: true;
  upcoming: EventSummary[];
  past: EventSummary[];
}

interface StudentEventRegistrationResponse {
  success: true;
  message: string;
  registrationCount: number;
  maxRegistrations: number;
}

interface AdminEventsResponse {
  success: true;
  events: EventSummary[];
}

interface AdminEventResponse {
  success: true;
  message?: string;
  event: EventSummary;
}

interface AdminPosterUploadResponse {
  success: true;
  poster: {
    url: string;
    publicId: string;
  };
}

interface AdminEventRegistrationsResponse {
  success: true;
  event: AdminEventRegistrationSummary;
  registrations: AdminEventRegistrationStudent[];
}

const getErrorMessage = (data: unknown): string => {
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return "Request failed. Please try again.";
};

const getErrorCode = (data: unknown): string | undefined => {
  if (
    data &&
    typeof data === "object" &&
    "code" in data &&
    typeof data.code === "string"
  ) {
    return data.code;
  }

  return undefined;
};

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getFilenameFromContentDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] ?? null;
};

export const getStudentEvents = (signal?: AbortSignal) =>
  apiRequest<StudentEventsResponse>("/api/student/events", { signal });

export const registerForEvent = (eventId: string) =>
  apiRequest<StudentEventRegistrationResponse>(
    `/api/student/events/${encodeURIComponent(eventId)}/register`,
    {
      method: "POST",
    }
  );

export const getAdminEvents = (signal?: AbortSignal) =>
  apiRequest<AdminEventsResponse>("/api/admin/events", { signal });

export const uploadAdminEventPoster = async (file: File) => {
  const formData = new FormData();
  formData.append("poster", file);

  const response = await fetch(`${API_BASE_URL}/api/admin/events/poster`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: getErrorCode(data),
      message: getErrorMessage(data),
      data,
    });
  }

  return data as AdminPosterUploadResponse;
};

export const createAdminEvent = (input: EventInput) =>
  apiRequest<AdminEventResponse>("/api/admin/events", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateAdminEvent = (eventId: string, input: Partial<EventInput>) =>
  apiRequest<AdminEventResponse>(
    `/api/admin/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );

export const getAdminEventRegistrations = (eventId: string, signal?: AbortSignal) =>
  apiRequest<AdminEventRegistrationsResponse>(
    `/api/admin/events/${encodeURIComponent(eventId)}/registrations`,
    { signal }
  );

export const downloadAdminEventRegistrations = async (
  eventId: string
): Promise<{ blob: Blob; filename: string }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/events/${encodeURIComponent(eventId)}/registrations/export`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const data = await parseJsonSafely(response);
    throw new ApiError({
      status: response.status,
      code: getErrorCode(data),
      message: getErrorMessage(data),
      data,
    });
  }

  const blob = await response.blob();
  const filename =
    getFilenameFromContentDisposition(response.headers.get("Content-Disposition")) ??
    "event-registrations.xlsx";

  return { blob, filename };
};
