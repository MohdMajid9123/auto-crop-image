
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Navbar from "./component/Navbar";
import ImageUploader from "./component/ImageUploader";
import ImageEditor from "./component/ImageEditor";
import A4PrintSheet from "./component/A4PrintSheet";
import ImageToPdf from "./component/ImageToPdf";

function CropImageTool() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [croppedImages, setCroppedImages] = useState([]);

  function handleImageSelect(files) {
    const validFiles = Array.from(files || []).filter(
      (file) => file instanceof File && file.type.startsWith("image/")
    );

    if (validFiles.length === 0) return;

    setSelectedFiles(validFiles);
    setCurrentIndex(0);
  }

  function handleCropComplete(croppedImage) {
    setCroppedImages((previous) => [...previous, croppedImage]);
    setCurrentIndex((previous) => previous + 1);
  }

  function handleAddMore(files) {
    handleImageSelect(files);
  }

  function handleRemoveImage(indexToRemove) {
    setCroppedImages((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  }

  function handleStartOver() {
    setSelectedFiles([]);
    setCurrentIndex(0);
    setCroppedImages([]);
  }

  const isCropping = currentIndex < selectedFiles.length;
  const showPrintSheet = !isCropping && croppedImages.length > 0;

  return (
    <div id="home" className="min-h-screen bg-slate-50">
      {isCropping ? (
        <ImageEditor
          key={`${currentIndex}-${selectedFiles[currentIndex].name}`}
          file={selectedFiles[currentIndex]}
          imageNumber={currentIndex + 1}
          totalImages={selectedFiles.length}
          onChooseAnother={handleStartOver}
          onCropComplete={handleCropComplete}
        />
      ) : showPrintSheet ? (
        <A4PrintSheet
          images={croppedImages}
          onAddMore={handleAddMore}
          onRemoveImage={handleRemoveImage}
          onStartOver={handleStartOver}
        />
      ) : (
        <ImageUploader onImageSelect={handleImageSelect} />
      )}
    </div>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <Routes>
        <Route path="/" element={<CropImageTool />} />
        <Route path="/image-to-pdf" element={<ImageToPdf />} />
        <Route
          path="*"
          element={
            <div className="p-10 text-center">
              <h1 className="text-2xl font-bold">Page not found</h1>
              <a className="mt-4 inline-block text-sky-600" href="/">
                Go to Home
              </a>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
