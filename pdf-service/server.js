import express from "express";
import cors from "cors";
import PDFDocument from "pdfkit";
import sizeOf from "image-size";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Health check для Kubernetes Liveness / Readiness probes
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "pdf-service" });
});

app.post("/generatePDF", async (req, res) => {
  try {
    const { studentCertificates } = req.body;

    if (!studentCertificates || studentCertificates.length === 0) {
      return res.status(400).json({ error: "No certificates provided" });
    }

    const a4Dimensions = [595, 842];
    const margin = 0;

    const doc = new PDFDocument({
      size: a4Dimensions,
      margin,
      layout: "landscape",
    });

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.send(pdfBuffer);
    });

    studentCertificates.forEach((certificatePath, index) => {
      const imageBuffer = Buffer.from(certificatePath, "base64");
      const imageDimensions = sizeOf(imageBuffer);

      const pageWidth = a4Dimensions[1];
      const pageHeight = a4Dimensions[0];
      const imageAspect = imageDimensions.width / imageDimensions.height;
      const pageAspect = pageWidth / pageHeight;

      let width, height;
      if (imageAspect > pageAspect) {
        width = pageWidth;
        height = pageWidth / imageAspect;
      } else {
        height = pageHeight;
        width = pageHeight * imageAspect;
      }

      const x = (pageWidth - width) / 2;
      const y = (pageHeight - height) / 2;

      doc.image(imageBuffer, x, y, { width, height });

      if (index !== studentCertificates.length - 1) {
        doc.addPage({
          size: a4Dimensions,
          margin,
          layout: "landscape",
        });
      }
    });

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Server error during PDF generation" });
  }
});

app.listen(PORT, () => {
  console.log(`=== PDF Service running on port ${PORT} ===`);
});

export default app;