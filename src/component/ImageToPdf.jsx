
import { useRef, useState } from "react";
import { jsPDF } from "jspdf";

function ImageToPdf() {
  const fileInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [orientation, setOrientation] = useState("portrait");
  const [pageSize, setPageSize] = useState("a4");
  const [margin, setMargin] = useState("none");
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");

  async function readImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const src = reader.result;

        const image = new Image();

        image.onload = () => {
          resolve({
            id: `${Date.now()}-${Math.random()}`,
            file,
            src,
            width: image.naturalWidth,
            height: image.naturalHeight,
          });
        };

        image.onerror = () => reject(
          new Error(`Could not read ${file.name}`)
        );

        image.src = src;
      };

      reader.onerror = () => reject(
        new Error(`Could not load ${file.name}`)
      );

      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(event) {
    const files = Array.from(event.target.files || []).filter(
      (file) => file.type.startsWith("image/")
    );

    event.target.value = "";
    setError("");

    if (files.length === 0) return;

    try {
      const loadedImages = await Promise.all(files.map(readImage));

      setImages((previous) => [...previous, ...loadedImages]);
    } catch (err) {
      setError(err.message || "Some images could not be loaded.");
    }
  }

  function handleRemoveImage(id) {
    setImages((previous) => previous.filter((image) => image.id !== id));
  }

  function handleMoveImage(index, direction) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= images.length) return;

    setImages((previous) => {
      const updated = [...previous];

      [updated[index], updated[targetIndex]] = [
        updated[targetIndex],
        updated[index],
      ];

      return updated;
    });
  }

  function getPageDimensions(image) {
    if (pageSize === "fit") {
      // Fit mode uses the first image's proportions for every page.
      const ratio = image.width / image.height;

      let width = 210;
      let height = width / ratio;

      if (height > 297) {
        height = 297;
        width = height * ratio;
      }

      if (orientation === "landscape" && width < height) {
        [width, height] = [height, width];
      }

      if (orientation === "portrait" && width > height) {
        [width, height] = [height, width];
      }

      return [width, height];
    }

    const dimensions =
      pageSize === "letter" ? [215.9, 279.4] : [210, 297];

    return orientation === "landscape"
      ? [dimensions[1], dimensions[0]]
      : dimensions;
  }

  async function handleConvert() {
    if (images.length === 0) {
      setError("Please select at least one image first.");
      return;
    }

    setIsConverting(true);
    setError("");

    try {
      const firstPage = getPageDimensions(images[0]);

      const pdf = new jsPDF({
        orientation:
          firstPage[0] > firstPage[1] ? "landscape" : "portrait",
        unit: "mm",
        format: firstPage,
        compress: true,
      });

      const marginSizes = {
        none: 0,
        small: 10,
        big: 20,
      };

      const selectedMargin = marginSizes[margin];

      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        const [pageWidth, pageHeight] = getPageDimensions(
          pageSize === "fit" ? images[0] : image
        );

        if (index > 0) {
          pdf.addPage(
            [pageWidth, pageHeight],
            pageWidth > pageHeight ? "landscape" : "portrait"
          );
        }

        const availableWidth = Math.max(
          1,
          pageWidth - selectedMargin * 2
        );

        const availableHeight = Math.max(
          1,
          pageHeight - selectedMargin * 2
        );

        const scale = Math.min(
          availableWidth / image.width,
          availableHeight / image.height
        );

        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2;

        const format = image.file.type.toLowerCase().includes("png")
          ? "PNG"
          : "JPEG";

        pdf.addImage(
          image.src,
          format,
          x,
          y,
          drawWidth,
          drawHeight,
          undefined,
          "FAST"
        );
      }

      pdf.save("images-to-pdf.pdf");
    } catch (err) {
      console.error("PDF conversion failed:", err);
      setError("PDF could not be created. Please try different images.");
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <main className="pdf-tool">
      <div className="pdf-workspace">
        {/* 70% image preview area */}
        <section className="pdf-preview-panel">
          <div className="pdf-panel-heading">
            <div>
              <h1>Image to PDF</h1>
              <p>
                {images.length} image{images.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            <button
              type="button"
              className="pdf-add-button"
              onClick={() => fileInputRef.current?.click()}
            >
              + Add More Images
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFileChange}
          />

          {images.length === 0 ? (
            <button
              type="button"
              className="pdf-empty-state"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="pdf-upload-icon">＋</span>
              <strong>Select images to convert</strong>
              <span>Choose JPG, PNG or other supported image files</span>
            </button>
          ) : (
            <div className="pdf-image-grid">
              {images.map((image, index) => (
                <article className="pdf-image-card" key={image.id}>
                  <div className="pdf-image-number">
                    Image {index + 1}
                  </div>

                  <div className="pdf-image-frame">
                    <img src={image.src} alt={`Selected image ${index + 1}`} />
                  </div>

                  <div className="pdf-image-actions">
                    <button
                      type="button"
                      title="Move left"
                      aria-label="Move image earlier"
                      disabled={index === 0}
                      onClick={() => handleMoveImage(index, -1)}
                    >
                      ←
                    </button>

                    <button
                      type="button"
                      title="Move right"
                      aria-label="Move image later"
                      disabled={index === images.length - 1}
                      onClick={() => handleMoveImage(index, 1)}
                    >
                      →
                    </button>

                    <button
                      type="button"
                      className="pdf-remove-button"
                      onClick={() => handleRemoveImage(image.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 30% PDF settings panel */}
        <aside className="pdf-options-panel">
          <h2>PDF Options</h2>

          <div className="pdf-option-group">
            <label>Page orientation</label>

            <div className="pdf-orientation-options">
              <button
                type="button"
                className={orientation === "portrait" ? "selected" : ""}
                onClick={() => setOrientation("portrait")}
              >
                <span className="orientation-icon portrait-icon" />
                Portrait
              </button>

              <button
                type="button"
                className={orientation === "landscape" ? "selected" : ""}
                onClick={() => setOrientation("landscape")}
              >
                <span className="orientation-icon landscape-icon" />
                Landscape
              </button>
            </div>
          </div>

          <div className="pdf-option-group">
            <label htmlFor="pdf-page-size">Page size</label>

            <select
              id="pdf-page-size"
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value)}
            >
              <option value="fit">Fit (same proportions as image)</option>
              <option value="a4">A4 (210 × 297 mm)</option>
              <option value="letter">US Letter (215.9 × 279.4 mm)</option>
            </select>
          </div>

          <div className="pdf-option-group">
            <label>Margin</label>

            <div className="pdf-margin-options">
              {[
                { value: "none", label: "No margin" },
                { value: "small", label: "Small" },
                { value: "big", label: "Big" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={margin === item.value ? "selected" : ""}
                  onClick={() => setMargin(item.value)}
                >
                  <span className={`margin-icon margin-${item.value}`}>
                    <span />
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <p className="pdf-settings-note">
            Each image will be placed on its own PDF page, in the order shown
            in the preview.
          </p>

          {error && <p className="pdf-error">{error}</p>}

          <button
            type="button"
            className="pdf-convert-button"
            disabled={images.length === 0 || isConverting}
            onClick={handleConvert}
          >
            {isConverting ? "Creating PDF..." : "Convert to PDF"}
          </button>
        </aside>
      </div>
    </main>
  );
}

export default ImageToPdf;
