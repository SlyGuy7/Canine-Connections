const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getHeaders() {
  const headers = { "Content-Type": "application/json" };

  const userEmail = localStorage.getItem("userEmail");
  if (userEmail) {
    headers["Authorization"] = `Bearer ${userEmail}`;
  }
  
  return headers;
}

export async function apiPost(path, body) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body)
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