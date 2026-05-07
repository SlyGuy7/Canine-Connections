// Legacy HTTP REST client. Most data fetching in the app now goes through messaging.js (RabbitMQ).
// This file is kept as a fallback for any endpoints that still use plain HTTP.

// Base URL — falls back to localhost:8000 for local development if the env variable is not set.
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Builds the common request headers, attaching a Bearer token if the user is logged in.
function getHeaders() {
  const headers = { "Content-Type": "application/json" };
  const userId = localStorage.getItem("userId");
  if (userId) {
    headers["Authorization"] = `Bearer ${userId}`;
  }
  return headers;
}

// Sends a POST request to the given path with a JSON body.
// Always returns an object with at least { success: boolean } regardless of error type.
export async function apiPost(path, body) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body)
    });

    // Gracefully handle non-JSON responses instead of throwing.
    const data = await res.json().catch(() => ({
      success: false,
      message: "Invalid JSON response from API"
    }));

    if (!res.ok) {
      return { success: false, ...data };
    }

    return data;

  } catch (error) {
    console.error("Network Error:", error);
    return { success: false, message: "Network error or server is down" };
  }
}

// Sends a GET request to the given path.
// Returns the parsed JSON body or a standardised error object.
export async function apiGet(path) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: "GET",
      headers: getHeaders(),
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: "Invalid JSON response from API"
    }));

    if (!res.ok) {
      return { success: false, ...data };
    }

    return data;

  } catch (error) {
    console.error("Network Error:", error);
    return { success: false, message: "Network error or server is down" };
  }
}