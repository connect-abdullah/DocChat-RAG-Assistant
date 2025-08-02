"use server";
import { supabaseAdmin } from "@/lib/supabase.admin";

export const parseText = async (documentId: string) => {
  const { data: pathData, error: pathError } = await supabaseAdmin
    .from("documents")
    .select("path,ext")
    .eq("id", documentId)
    .single();

  if (pathError) {
    console.error("Error fetching document path:", pathError);
    return {
      error: { message: pathError.message || "Failed to fetch document path" },
    };
  }
  const path = pathData?.path;
  const ext = pathData?.ext;

  // Get Signed-Url
  const { data: signedUrlData, error: signedUrlError } =
    await supabaseAdmin.storage.from("user-files").createSignedUrl(path, 180);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error("Signed URL error:", signedUrlError);
    return {
      error: { message: signedUrlError?.message || "Failed to get signed URL" },
    };
  }

  // Fetch File
  const res = await fetch(signedUrlData?.signedUrl);
  const buffer = await res.arrayBuffer();
  const fileBuffer = Buffer.from(buffer);

  let text = "";

  try {
    if (ext === "pdf") {
      // Use pdf2json for reliable PDF text extraction
      try {
        const PDFParser = await import("pdf2json");
        const pdfParser = new PDFParser.default();
        
        // Convert buffer to base64 for pdf2json
        const base64Data = fileBuffer.toString('base64');
        
        // Parse PDF and extract text
        const pdfData = await new Promise<{ Pages?: Array<{ Texts?: Array<{ R: Array<{ T: string }> }> }> }>((resolve, reject) => {
          pdfParser.on("pdfParser_dataReady", (pdfData) => {
            resolve(pdfData);
          });
          
          pdfParser.on("pdfParser_dataError", (errData: Record<"parserError", Error>) => {
            reject(new Error(errData.parserError.message || "PDF parsing failed"));
          });
          
          // Parse the buffer
          pdfParser.parseBuffer(fileBuffer);
        });
        
        // Extract text from all pages
        let fullText = "";
        if (pdfData.Pages) {
          pdfData.Pages.forEach((page: { Texts?: Array<{ R: Array<{ T: string }> }> }) => {
            if (page.Texts) {
              page.Texts.forEach((textItem: { R: Array<{ T: string }> }) => {
                // Decode the text (pdf2json encodes text)
                const decodedText = decodeURIComponent(textItem.R[0].T);
                fullText += decodedText + " ";
              });
            }
          });
        }
        
        text = fullText.trim();
        console.log("Successfully extracted text from PDF using pdf2json");
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        throw new Error("Failed to parse PDF file");
      }
    } else if (ext === "docx") {
      // Dynamic import to avoid module initialization issues
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      text = result.value;
    } else {
      throw new Error("Unsupported file type");
    }
  } catch (parseError) {
    console.error("Text extraction failed:", parseError);
    return {
      error: {
        message:
          parseError instanceof Error
            ? parseError.message
            : "Text extraction failed",
      },
    };
  }

  // Update row with text
  const { error: updateError } = await supabaseAdmin
    .from("documents")
    .update({ text })
    .eq("id", documentId);

  if (updateError) {
    console.error("Update error:", updateError);
    return {
      error: { message: updateError.message || "Failed to update document" },
    };
  }

  return { success: true, documentId };
};
