/**
 * Prints the current page. 
 * Since we want to print only the specific report content, 
 * we define hiding rules in index.css using @media print.
 * @param _elementId Ignored in this implementation as we use global print.
 * @param fileName The name to use for the PDF file (sets page title temporarily).
 */
export const exportToPDF = async (_elementId: string, fileName: string) => {
  const originalTitle = document.title;
  
  try {
    // Temporarily set document title so the browser uses it as the default filename
    document.title = fileName;
    
    // Small delay to ensure any layout shifts settle if needed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Trigger the native browser print dialog
    window.print();
  } catch (error) {
    console.error('Print error:', error);
    alert('印刷ダイアログの起動に失敗しました。Ctrl+Pをお試しください。');
  } finally {
    // Restore original title
    document.title = originalTitle;
  }
};
