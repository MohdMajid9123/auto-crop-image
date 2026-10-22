
function ImageUploader({ onImageSelect }) {
  function handleFileChange(event) {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))

    if (files.length > 0) {
      onImageSelect(files)
    }

    event.target.value = ''
  }

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Choose Your Images
        </h1>

        <p className="mt-3 text-slate-500">
          Select multiple images to crop and arrange them on A4 paper.
        </p>

        <input
          id="image-file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() =>
            document.getElementById('image-file-input')?.click()
          }
          className="mt-8 rounded-xl bg-sky-600 px-7 py-3 font-semibold text-white hover:bg-sky-700"
        >
          CHOOSE MULTIPLE IMAGES
        </button>
      </div>
    </section>
  )
}

export default ImageUploader
