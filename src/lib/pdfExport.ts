import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a DOM element to a PDF file.
 * @param elementId The ID of the element to export.
 * @param fileName The name of the PDF file.
 */
export const exportToPDF = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  // Pre-capture scroll position
  const originalScrollPos = window.scrollY;
  
  try {
    // Show a loading cursor
    document.body.style.cursor = 'wait';

    // Capture with html2canvas
    const canvas = await html2canvas(element, {
      scale: 2, // 2x for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // Better capture of hidden/offscreen elements
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // PDF setup (A4: 210mm x 297mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    
    const imgProps = pdf.getImageProperties(imgData);
    const renderedImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    let heightLeft = renderedImgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderedImgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // Add subsequent pages if content is long
    while (heightLeft > 0) {
      position = heightLeft - renderedImgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, renderedImgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('PDFの生成中にエラーが発生しました。別タブで開いて再度お試しいただくか、ブラウザの印刷機能（Ctrl+P）をご利用ください。');
  } finally {
    document.body.style.cursor = 'default';
    window.scrollTo(0, originalScrollPos);
  }
};
