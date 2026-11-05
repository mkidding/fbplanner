/**
 * Built-in sample images with distinct backgrounds and separated/floating parts
 * so users can test background removal, separated-part bridging, and 16/64/256 quantization.
 */

export interface SamplePreset {
  id: string;
  label: string;
  description: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "mushroom",
    label: "Spotted Mushroom",
    description: "Bright red cap figure on a mint studio background",
  },
  {
    id: "duck",
    label: "Yellow Duckling",
    description: "Golden duck character on a lavender sky backdrop",
  },
  {
    id: "robot",
    label: "Bot + Floating Hands",
    description: "Robot with detached floating hands & antenna orb to test part bridging",
  },
];

export async function createSampleImageFile(presetId: string): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create 2D canvas context");
  }

  if (presetId === "mushroom") {
    // Mint background that foreground extractor will strip
    ctx.fillStyle = "#d1fae5";
    ctx.fillRect(0, 0, 240, 240);

    // Stem
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.roundRect(78, 120, 84, 82, 24);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#78350f";
    ctx.stroke();

    // Eyes on stem
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(102, 156, 7, 0, Math.PI * 2);
    ctx.arc(138, 156, 7, 0, Math.PI * 2);
    ctx.fill();

    // Red Mushroom Cap
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(120, 118, 76, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White spots
    ctx.fillStyle = "#ffffff";
    [
      [120, 72, 18],
      [78, 94, 14],
      [162, 94, 14],
    ].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (presetId === "duck") {
    // Soft purple background
    ctx.fillStyle = "#e0e7ff";
    ctx.fillRect(0, 0, 240, 240);

    // Body
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.ellipse(125, 155, 62, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(100, 92, 42, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.ellipse(132, 156, 34, 20, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.ellipse(55, 96, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(88, 84, 7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cream studio background
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(0, 0, 240, 240);

    // Floating energy orb above head (detached island #1)
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(120, 30, 14, 0, Math.PI * 2);
    ctx.fill();

    // Robot Head
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.roundRect(66, 62, 108, 80, 16);
    ctx.fill();

    // Visor
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(80, 78, 80, 34, 10);
    ctx.fill();

    // Glowing eyes
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(102, 95, 8, 0, Math.PI * 2);
    ctx.arc(138, 95, 8, 0, Math.PI * 2);
    ctx.fill();

    // Torso
    ctx.fillStyle = "#0891b2";
    ctx.beginPath();
    ctx.roundRect(76, 148, 88, 56, 12);
    ctx.fill();

    // Chest badge
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(106, 164, 28, 22);

    // Floating Left & Right Hands (detached islands #2 and #3)
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(42, 168, 15, 0, Math.PI * 2);
    ctx.arc(198, 168, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/png");
  });

  return new File([blob], `${presetId}-sample.png`, { type: "image/png" });
}
