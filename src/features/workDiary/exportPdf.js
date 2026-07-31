/**
 * Work-diary PDF export.
 *
 * Rasterises a DOM node and slices the tall canvas into A4 pages (jsPDF won't
 * paginate a single image on its own). Uses html2canvas-pro rather than plain
 * html2canvas because this app's Tailwind v4 theme emits oklch() colours, which
 * the original engine can't parse. Both libraries are loaded on demand so they
 * stay out of the initial bundle.
 */

const addCanvasToPdf = (doc, canvas) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ratio = pageWidth / canvas.width;
  const pageHeightPx = Math.floor(pageHeight / ratio);

  let renderedPx = 0;
  let firstPage = true;
  while (renderedPx < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedPx);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = sliceHeight;
    slice
      .getContext("2d")
      .drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (!firstPage) doc.addPage();
    doc.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, sliceHeight * ratio);

    renderedPx += sliceHeight;
    firstPage = false;
  }
};

export async function exportNodeToPdf(node, filename = "work-diary.pdf") {
  if (!node) throw new Error("Nothing to export.");

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ]);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    // Screenshots are already cached by the browser as non-CORS images; a
    // cache-buster forces a fresh CORS-enabled fetch so they aren't dropped.
    backgroundColor: "#ffffff",
    logging: false,
    onclone: (doc) => {
      doc.querySelectorAll("img").forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (/^https?:\/\//i.test(src) && !src.includes("pdfexport=")) {
          img.setAttribute("crossorigin", "anonymous");
          img.setAttribute("src", src + (src.includes("?") ? "&" : "?") + "pdfexport=1");
        }
      });
    },
  });

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  addCanvasToPdf(doc, canvas);
  doc.save(filename);
}
