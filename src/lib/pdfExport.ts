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
    alert(`エラー: ID "${elementId}" の要素が見つかりませんでした。`);
    return;
  }

  // Pre-capture scroll position
  const originalScrollPos = window.scrollY;
  
  try {
    // Show a loading cursor
    document.body.style.cursor = 'wait';
    
    // Create a temporary overlay to show loading status
    const loader = document.createElement('div');
    loader.id = 'pdf-export-loader';
    loader.style.position = 'fixed';
    loader.style.top = '0';
    loader.style.left = '0';
    loader.style.width = '100%';
    loader.style.height = '100%';
    loader.style.backgroundColor = 'rgba(255,255,255,0.8)';
    loader.style.display = 'flex';
    loader.style.flexDirection = 'column';
    loader.style.alignItems = 'center';
    loader.style.justifyContent = 'center';
    loader.style.zIndex = '99999';
    loader.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;">
        <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
        <div style="font-weight: bold; color: #10b981; font-size: 16px;">PDFを作成中...</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 8px;">しばらくお待ちください</div>
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
    document.body.appendChild(loader);

    // Give the browser a moment to render the loader
    await new Promise(resolve => setTimeout(resolve, 300));

    // Capture with html2canvas
    const canvas = await html2canvas(element, {
      scale: 1.5, // Reasonable scale for quality vs memory
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById(elementId);
        if (el) {
          el.style.height = 'auto';
          el.style.overflow = 'visible';
          el.style.position = 'static';
          el.style.padding = '20px'; // Add some padding inside capture
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    
    // PDF setup (A4: 210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 10;
    const contentWidth = pdfWidth - (margin * 2);
    
    const imgProps = pdf.getImageProperties(imgData);
    const renderedImgHeight = (imgProps.height * contentWidth) / imgProps.width;
    
    let heightLeft = renderedImgHeight;
    let position = margin;

    // Add first page
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, renderedImgHeight, undefined, 'MEDIUM');
    heightLeft -= (pdfHeight - margin * 2);

    // Add subsequent pages if content is long
    while (heightLeft > 0) {
      position = heightLeft - renderedImgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, renderedImgHeight, undefined, 'MEDIUM');
      heightLeft -= (pdfHeight - margin * 2);
    }

    // Save PDF
    pdf.save(`${fileName}.pdf`);
    
    // Cleanup loader
    if (loader.parentNode) {
      document.body.removeChild(loader);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Explicitly check for loader and remove it
    const loader = document.getElementById('pdf-export-loader');
    if (loader && loader.parentNode) {
      document.body.removeChild(loader);
    }
    alert('PDFの生成中にエラーが発生しました。別タブで開いて再度お試しいただくか、ブラウザの印刷機能（Ctrl+P）をご利用ください。');
  } finally {
    document.body.style.cursor = 'default';
    window.scrollTo(0, originalScrollPos);
  }
};
