import { TemplateConfigParams, TemplateGenerateResponse } from "../types/template";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
  "/api/v1";

export async function generateBeadTemplate(
  file: File,
  params: TemplateConfigParams
): Promise<TemplateGenerateResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_width", String(params.targetWidth));
  formData.append("target_height", String(params.targetHeight));
  formData.append("palette_size", String(params.paletteSize));
  formData.append("extract_foreground", String(params.extractForeground));
  formData.append("preserve_aspect_ratio", String(params.preserveAspectRatio));
  formData.append("contour_mode", params.contourMode);
  formData.append("contour_color", params.contourColor);

  const response = await fetch(`${API_BASE}/templates/generate`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.detail) {
        errorMessage =
          typeof errorData.detail === "string"
            ? errorData.detail
            : JSON.stringify(errorData.detail);
      }
    } catch {
      // fallback to status message
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as TemplateGenerateResponse;
}
