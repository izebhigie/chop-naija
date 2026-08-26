import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * The plate-and-meridian mark, redrawn for 64px.
 *
 * The header logo carries three hairline latitude and longitude lines; at
 * favicon scale those collapse into grey mush, so this keeps the plate, one
 * meridian and the inner ring and drops the rest. Same idea, legible small.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f3d2e",
          borderRadius: 14,
        }}
      >
        <svg viewBox="0 0 32 32" width="52" height="52" fill="none" stroke="#faf6ee">
          <circle cx="16" cy="16" r="11.5" strokeWidth="2" />
          <circle cx="16" cy="16" r="5" strokeWidth="2" opacity="0.85" />
          <path d="M16 4.5c3 3.2 4.4 7 4.4 11.5S19 24.8 16 27.5" strokeWidth="1.75" opacity="0.7" />
          <path d="M16 4.5c-3 3.2-4.4 7-4.4 11.5S13 24.8 16 27.5" strokeWidth="1.75" opacity="0.7" />
        </svg>
      </div>
    ),
    size,
  );
}
