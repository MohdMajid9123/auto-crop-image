
import { useEffect, useRef, useState } from "react";

const OUTPUT_WIDTH = 1004;
const OUTPUT_HEIGHT = 650;

function ImageEditor({
  file,
  onChooseAnother,
  onCropComplete,
  imageNumber = 1,
  totalImages = 1,
}) {
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  const [imageUrl, setImageUrl] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [points, setPoints] = useState(null);
  const [error, setError] = useState("");
  const [isCropping, setIsCropping] = useState(false);

  // Create and clean up the temporary URL for the selected image.
  useEffect(() => {
    if (!file) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(file);

    setImageUrl(url);
    setPoints(null);
    setBrightness(100);
    setContrast(100);
    setError("");
    setIsCropping(false);
    dragRef.current = null;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Initialize exactly four crop corners when the image loads.
  function handleImageLoad(event) {
    const image = event.currentTarget;
    const width = image.naturalWidth;
    const height = image.naturalHeight;

    setPoints([
      { x: width * 0.1, y: height * 0.1 },
      { x: width * 0.9, y: height * 0.1 },
      { x: width * 0.9, y: height * 0.9 },
      { x: width * 0.1, y: height * 0.9 },
    ]);

    setError("");
  }

  // Convert screen coordinates into original-image coordinates.
  function getImagePoint(event) {
    const image = imageRef.current;

    if (!image) return null;

    const rect = image.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    return {
      x: Math.max(
        0,
        Math.min(
          image.naturalWidth,
          ((event.clientX - rect.left) / rect.width) *
            image.naturalWidth,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          image.naturalHeight,
          ((event.clientY - rect.top) / rect.height) *
            image.naturalHeight,
        ),
      ),
    };
  }

  // Start dragging one of the four corner handles.
  function startDrag(event, index) {
    event.preventDefault();
    event.stopPropagation();

    dragRef.current = {
      index,
      pointerId: event.pointerId,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePoint(event) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextPoint = getImagePoint(event);

    if (!nextPoint) return;

    setPoints((previous) => {
      if (!previous) return previous;

      return previous.map((point, pointIndex) =>
        pointIndex === drag.index ? nextPoint : point,
      );
    });
  }

  function stopDrag(event) {
    if (
      dragRef.current &&
      event.pointerId === dragRef.current.pointerId
    ) {
      dragRef.current = null;
    }
  }

  // Solve a system of eight equations for perspective correction.
  function solveLinearSystem(matrix, values) {
    const size = values.length;
    const rows = matrix.map((row, index) => [
      ...row,
      values[index],
    ]);

    for (let col = 0; col < size; col++) {
      let pivot = col;

      for (let row = col + 1; row < size; row++) {
        if (
          Math.abs(rows[row][col]) >
          Math.abs(rows[pivot][col])
        ) {
          pivot = row;
        }
      }

      if (Math.abs(rows[pivot][col]) < 1e-10) {
        throw new Error(
          "These corners cannot form a valid crop. Please adjust them.",
        );
      }

      [rows[col], rows[pivot]] = [rows[pivot], rows[col]];

      const divisor = rows[col][col];

      for (let j = col; j <= size; j++) {
        rows[col][j] /= divisor;
      }

      for (let row = 0; row < size; row++) {
        if (row === col) continue;

        const factor = rows[row][col];

        for (let j = col; j <= size; j++) {
          rows[row][j] -= factor * rows[col][j];
        }
      }
    }

    return rows.map((row) => row[size]);
  }

  // Calculate the perspective transformation.
  function getPerspectiveTransform(source, width, height) {
    const destination = [
      { x: 0, y: 0 },
      { x: width - 1, y: 0 },
      { x: width - 1, y: height - 1 },
      { x: 0, y: height - 1 },
    ];

    const matrix = [];
    const values = [];

    source.forEach((point, index) => {
      const { x, y } = destination[index];
      const { x: u, y: v } = point;

      matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
      values.push(u);

      matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
      values.push(v);
    });

    return [...solveLinearSystem(matrix, values), 1];
  }

  // Validate and crop the selected image.
  function handleCropNow() {
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (isCropping) return;

    if (!image || !canvas || !points || points.length !== 4) {
      setError("Please wait for the image to load.");
      return;
    }

    setIsCropping(true);
    setError("");

    try {
      const [topLeft, topRight, bottomRight, bottomLeft] = points;

      // Check that the selected crop area is large enough.
      const polygonArea = Math.abs(
        points.reduce((sum, point, index) => {
          const next = points[(index + 1) % points.length];

          return (
            sum +
            point.x * next.y -
            next.x * point.y
          );
        }, 0),
      ) / 2;

      if (polygonArea < 100) {
        throw new Error(
          "The crop area is too small. Move the corner points.",
        );
      }

      // Reject crossed or incorrectly ordered corners.
      const cross = (a, b, c) =>
        (b.x - a.x) * (c.y - b.y) -
        (b.y - a.y) * (c.x - b.x);

      const turns = [
        cross(topLeft, topRight, bottomRight),
        cross(topRight, bottomRight, bottomLeft),
        cross(bottomRight, bottomLeft, topLeft),
        cross(bottomLeft, topLeft, topRight),
      ];

      const hasPositiveTurn = turns.some((turn) => turn > 0);
      const hasNegativeTurn = turns.some((turn) => turn < 0);

      if (
        turns.some((turn) => Math.abs(turn) < 1e-6) ||
        (hasPositiveTurn && hasNegativeTurn)
      ) {
        throw new Error(
          "The corners must form a valid shape. Please adjust them.",
        );
      }

      const transform = getPerspectiveTransform(
        points,
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT,
      );

      const sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = image.naturalWidth;
      sourceCanvas.height = image.naturalHeight;

      const sourceContext = sourceCanvas.getContext("2d", {
        willReadFrequently: true,
      });

      if (!sourceContext) {
        throw new Error("Could not process this image.");
      }

      sourceContext.drawImage(image, 0, 0);

      const sourcePixels = sourceContext.getImageData(
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height,
      );

      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;

      const outputContext = canvas.getContext("2d");

      if (!outputContext) {
        throw new Error("Could not create the cropped image.");
      }

      const outputPixels = outputContext.createImageData(
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT,
      );

      const [a, b, c, d, e, f, g, h, i] = transform;

      // Apply brightness and contrast while mapping pixels.
      const adjust = (value) =>
        Math.max(
          0,
          Math.min(
            255,
            ((value / 255 - 0.5) * (contrast / 100) + 0.5) *
              255 *
              (brightness / 100),
          ),
        );

      for (let y = 0; y < OUTPUT_HEIGHT; y++) {
        for (let x = 0; x < OUTPUT_WIDTH; x++) {
          const denominator = g * x + h * y + i;

          if (Math.abs(denominator) < 1e-10) continue;

          const sourceX = (a * x + b * y + c) / denominator;
          const sourceY = (d * x + e * y + f) / denominator;

          if (
            sourceX < 0 ||
            sourceY < 0 ||
            sourceX >= sourceCanvas.width ||
            sourceY >= sourceCanvas.height
          ) {
            continue;
          }

          const sx = Math.floor(sourceX);
          const sy = Math.floor(sourceY);
          const sourceIndex =
            (sy * sourceCanvas.width + sx) * 4;
          const outputIndex =
            (y * OUTPUT_WIDTH + x) * 4;

          outputPixels.data[outputIndex] = adjust(
            sourcePixels.data[sourceIndex],
          );
          outputPixels.data[outputIndex + 1] = adjust(
            sourcePixels.data[sourceIndex + 1],
          );
          outputPixels.data[outputIndex + 2] = adjust(
            sourcePixels.data[sourceIndex + 2],
          );
          outputPixels.data[outputIndex + 3] =
            sourcePixels.data[sourceIndex + 3];
        }
      }

      outputContext.putImageData(outputPixels, 0, 0);

      const croppedImage = canvas.toDataURL("image/jpeg", 0.95);

      // Save this image and let App.jsx open the next one.
      onCropComplete(croppedImage);
    } catch (err) {
      setError(err.message || "Could not crop this image.");
      setIsCropping(false);
    }
  }

  // Keep each handle aligned with its corner on the displayed image.
  function getHandleStyle(point) {
    const image = imageRef.current;

    if (!image || !image.naturalWidth || !image.naturalHeight) {
      return {};
    }

    const rect = image.getBoundingClientRect();

    return {
      left: `${(point.x / image.naturalWidth) * rect.width}px`,
      top: `${(point.y / image.naturalHeight) * rect.height}px`,
    };
  }

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Image Editor
          </h1>

          <p className="mt-1 text-sm font-medium text-sky-700">
            Cropping Image {imageNumber} of {totalImages}
          </p>
        </div>

        <button
          type="button"
          onClick={onChooseAnother}
          disabled={isCropping}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Over
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-10">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 lg:col-span-7">
          <h2 className="mb-2 font-semibold text-slate-800">
            Four-Point Crop
          </h2>

          <p className="mb-4 text-sm text-slate-500">
            Drag the four blue corners to match the image angle.
          </p>

          <div className="overflow-auto rounded-xl bg-slate-900 p-3">
            <div className="relative mx-auto w-fit max-w-full">
              {imageUrl && (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Image to crop"
                  onLoad={handleImageLoad}
                  draggable={false}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "65vh",
                    width: "auto",
                    height: "auto",
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  }}
                />
              )}

              {points && imageRef.current && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                  viewBox={`0 0 ${imageRef.current.naturalWidth} ${imageRef.current.naturalHeight}`}
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={points
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                    fill="rgba(14,165,233,0.12)"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}

              {points && imageRef.current && (
                <div className="absolute inset-0">
                  {points.map((point, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Move crop corner ${index + 1}`}
                      onPointerDown={(event) => startDrag(event, index)}
                      onPointerMove={movePoint}
                      onPointerUp={stopDrag}
                      onPointerCancel={stopDrag}
                      className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 touch-none cursor-crosshair rounded-full border-2 border-white bg-sky-500 shadow-md disabled:cursor-not-allowed"
                      style={getHandleStyle(point)}
                      disabled={isCropping}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Only four corner points are available.
          </p>
        </section>

        <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-3">
          <h2 className="mb-5 font-semibold text-slate-800">
            Image Settings
          </h2>

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Brightness: {brightness}%
          </label>

          <input
            type="range"
            min="0"
            max="200"
            value={brightness}
            disabled={isCropping}
            onChange={(event) =>
              setBrightness(Number(event.target.value))
            }
            className="mb-5 w-full accent-sky-600"
          />

          <label className="mb-2 block text-sm font-medium text-slate-700">
            Contrast: {contrast}%
          </label>

          <input
            type="range"
            min="0"
            max="200"
            value={contrast}
            disabled={isCropping}
            onChange={(event) =>
              setContrast(Number(event.target.value))
            }
            className="mb-6 w-full accent-sky-600"
          />

          <div className="mb-5 rounded-xl border border-slate-200 p-3">
            <p className="text-sm font-semibold text-slate-800">
              Fixed Output Size
            </p>
            <p className="mt-1 text-sm text-slate-500">
              8.5 cm × 5.5 cm
            </p>
            <p className="mt-1 text-xs text-slate-500">
              1004 × 650 pixels · intended for 300 DPI printing
            </p>
          </div>

          <button
            type="button"
            onClick={handleCropNow}
            disabled={isCropping || !points}
            className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isCropping ? "Cropping..." : "Crop Now"}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
        </aside>
      </div>

      {/* Hidden canvas used to generate the final cropped image. */}
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}

export default ImageEditor