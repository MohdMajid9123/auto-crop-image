
import { useRef } from "react";

function A4PrintSheet({
  images,
  onAddMore,
  onRemoveImage,
  onStartOver,
}) {
  const fileInputRef = useRef(null);

  // Har A4 page par maximum 6 images
  const pages = [];

  for (let i = 0; i < images.length; i += 6) {
    pages.push(images.slice(i, i + 6));
  }

  // Nayi images select karna
  function handleFileChange(event) {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith("image/")
    );

    if (files.length > 0) {
      onAddMore(files);
    }

    // Wahi file dobara select karne ki permission
    event.target.value = "";
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {/* Heading and Print button */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            A4 Print Preview
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {images.length} images · {pages.length} A4 page(s)
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
        >
          Print
        </button>
      </div>

      {/* Add More and Start Over buttons */}
      <div className="mb-5 flex flex-wrap gap-3 print:hidden">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
        >
          + Add More Images
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Start Over
        </button>
      </div>

      {/* Empty state */}
      {images.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          No images left. Click Add More Images to select new images.
        </p>
      ) : (
        /* A4 pages */
        <div className="print-pages">
          {pages.map((pageImages, pageIndex) => (
            <section className="a4-page" key={pageIndex}>
              {pageImages.map((src, index) => {
                const imageIndex = pageIndex * 6 + index;

                return (
                  <div className="a4-image-cell" key={imageIndex}>
                    <img
                      src={src}
                      alt={`Cropped image ${imageIndex + 1}`}
                    />

                    <button
                      type="button"
                      title="Remove this image"
                      aria-label={`Remove image ${imageIndex + 1}`}
                      onClick={() => onRemoveImage(imageIndex)}
                      className="remove-image-button print:hidden"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

export default A4PrintSheet;
