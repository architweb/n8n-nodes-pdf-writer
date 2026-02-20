import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export class PdfTextWriter implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'PDF Text Writer',
    name: 'pdfTextWriter',
    icon: 'file:pdf-text-writer.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{ $parameter["operation"] === "merge" ? "Merge PDFs" : "Write text on PDF" }}',
    description: 'Write text on PDF pages or merge specific pages from multiple PDFs',
    defaults: {
      name: 'PDF Text Writer',
    },
    inputs: [{ type: 'main' as const }],
    outputs: [{ type: 'main' as const }],
    properties: [
      // ─── Operation ────────────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        default: 'writeText',
        options: [
          {
            name: 'Write Text',
            value: 'writeText',
            description: 'Write text at specific X/Y coordinates on a PDF',
          },
          {
            name: 'Merge PDFs',
            value: 'merge',
            description: 'Merge specific pages from multiple PDF files into one',
          },
        ],
      },
      // ─── Write Text: Input ────────────────────────────────────────────────
      {
        displayName: 'Input PDF Field',
        name: 'inputField',
        type: 'string',
        default: 'data',
        description:
          'Name of the binary field that contains the input PDF (e.g. "data")',
        displayOptions: {
          show: {
            operation: ['writeText'],
          },
        },
      },
      {
        displayName: 'Output Field Name',
        name: 'outputField',
        type: 'string',
        default: 'data',
        description: 'Name of the binary field to write the modified PDF to',
        displayOptions: {
          show: {
            operation: ['writeText'],
          },
        },
      },
      // ─── Merge: Input ─────────────────────────────────────────────────────
      {
        displayName: 'Binary Field',
        name: 'mergeBinaryField',
        type: 'string',
        default: 'data',
        description: 'Name of the binary field containing the PDF in each input item',
        displayOptions: {
          show: {
            operation: ['merge'],
          },
        },
      },
      {
        displayName: 'Pages Per Item',
        name: 'mergeMode',
        type: 'options',
        default: 'all',
        options: [
          {
            name: 'All Pages',
            value: 'all',
            description: 'Include all pages from each input PDF',
          },
          {
            name: 'Select Pages Per Item',
            value: 'select',
            description: 'Specify which pages to take from each input item (configured per item via expression)',
          },
        ],
        displayOptions: {
          show: {
            operation: ['merge'],
          },
        },
      },
      {
        displayName: 'Pages',
        name: 'mergePages',
        type: 'string',
        default: 'all',
        description: 'Pages to include from this PDF. Use comma-separated values and ranges: e.g. "1,3,5-8", "2-4", or "all" for all pages. Pages are 1-based.',
        placeholder: 'e.g. 1,3,5-8',
        displayOptions: {
          show: {
            operation: ['merge'],
            mergeMode: ['select'],
          },
        },
      },
      {
        displayName: 'Output Field Name',
        name: 'mergeOutputField',
        type: 'string',
        default: 'data',
        description: 'Name of the binary field to write the merged PDF to',
        displayOptions: {
          show: {
            operation: ['merge'],
          },
        },
      },
      {
        displayName: 'Output File Name',
        name: 'mergeFileName',
        type: 'string',
        default: 'merged.pdf',
        description: 'File name for the merged PDF output',
        displayOptions: {
          show: {
            operation: ['merge'],
          },
        },
      },
      // ─── Write Text: Text entries (fixed list) ────────────────────────────
      {
        displayName: 'Text Entries',
        displayOptions: {
          show: {
            operation: ['writeText'],
          },
        },
        name: 'textEntries',
        type: 'fixedCollection',
        placeholder: 'Add Text Entry',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        options: [
          {
            name: 'entry',
            displayName: 'Text Entry',
            values: [
              {
                displayName: 'Label',
                name: 'label',
                type: 'string',
                default: '',
                description: 'A name to identify this text entry (e.g. "Header", "Footer", "Stamp")',
                placeholder: 'e.g. Header',
              },
              {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                default: '',
                description: 'The text to write on the PDF',
              },
              {
                displayName: 'Page',
                name: 'page',
                type: 'number',
                default: 1,
                description:
                  'Page number to write on (1-based index). Use 0 for all pages.',
                typeOptions: {
                  minValue: 0,
                },
              },
              {
                displayName: 'X Position',
                name: 'x',
                type: 'number',
                default: 50,
                description:
                  'Horizontal position in points from the left edge of the page',
              },
              {
                displayName: 'Y Position',
                name: 'y',
                type: 'number',
                default: 50,
                description:
                  'Vertical position in points from the bottom edge of the page (PDF coordinate system). Use "Y from Top" option to switch.',
              },
              {
                displayName: 'Y Origin',
                name: 'yOrigin',
                type: 'options',
                default: 'bottom',
                options: [
                  {
                    name: 'From Bottom (PDF default)',
                    value: 'bottom',
                  },
                  {
                    name: 'From Top',
                    value: 'top',
                  },
                ],
                description: 'Whether Y is measured from the bottom or the top of the page',
              },
              {
                displayName: 'Font Size',
                name: 'fontSize',
                type: 'number',
                default: 12,
                typeOptions: { minValue: 1 },
              },
              {
                displayName: 'Font',
                name: 'font',
                type: 'options',
                default: 'Helvetica',
                options: [
                  { name: 'Helvetica', value: 'Helvetica' },
                  { name: 'Helvetica Bold', value: 'Helvetica-Bold' },
                  { name: 'Helvetica Oblique', value: 'Helvetica-Oblique' },
                  { name: 'Times Roman', value: 'Times-Roman' },
                  { name: 'Times Bold', value: 'Times-Bold' },
                  { name: 'Courier', value: 'Courier' },
                  { name: 'Courier Bold', value: 'Courier-Bold' },
                ],
              },
              {
                displayName: 'Color (Hex)',
                name: 'color',
                type: 'color',
                default: '#000000',
                description: 'Text color in hex format',
              },
              {
                displayName: 'Rotation (degrees)',
                name: 'rotation',
                type: 'number',
                default: 0,
                description: 'Text rotation in degrees (counter-clockwise)',
              },
              {
                displayName: 'Opacity',
                name: 'opacity',
                type: 'number',
                default: 1,
                typeOptions: { minValue: 0, maxValue: 1, numberStepSize: 0.1 },
                description: 'Text opacity from 0 (transparent) to 1 (opaque)',
              },
            ],
          },
        ],
      },
    ],
  };

  /**
   * Parse a page selection string like "1,3,5-8" into 0-based page indices.
   */
  private static parsePageSelection(selection: string, totalPages: number): number[] {
    const trimmed = selection.trim().toLowerCase();
    if (trimmed === 'all' || trimmed === '') {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const indices: number[] = [];
    const parts = trimmed.split(',');

    for (const part of parts) {
      const rangeParts = part.trim().split('-');
      if (rangeParts.length === 2) {
        const start = parseInt(rangeParts[0].trim(), 10);
        const end = parseInt(rangeParts[1].trim(), 10);
        if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
          throw new Error(`Invalid page range: "${part.trim()}". Pages must be >= 1.`);
        }
        for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
          if (p > totalPages) {
            throw new Error(`Page ${p} does not exist. The PDF has ${totalPages} page(s).`);
          }
          indices.push(p - 1); // convert to 0-based
        }
      } else if (rangeParts.length === 1) {
        const pageNum = parseInt(rangeParts[0].trim(), 10);
        if (isNaN(pageNum) || pageNum < 1) {
          throw new Error(`Invalid page number: "${rangeParts[0].trim()}". Pages must be >= 1.`);
        }
        if (pageNum > totalPages) {
          throw new Error(`Page ${pageNum} does not exist. The PDF has ${totalPages} page(s).`);
        }
        indices.push(pageNum - 1);
      } else {
        throw new Error(`Invalid page selection: "${part.trim()}". Use format like "1,3,5-8".`);
      }
    }

    return indices;
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    // ─── Merge PDFs ─────────────────────────────────────────────────────
    if (operation === 'merge') {
      try {
        const mergeBinaryField = this.getNodeParameter('mergeBinaryField', 0) as string;
        const mergeOutputField = this.getNodeParameter('mergeOutputField', 0) as string;
        const mergeFileName = this.getNodeParameter('mergeFileName', 0) as string;
        const mergeMode = this.getNodeParameter('mergeMode', 0) as string;

        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < items.length; i++) {
          const binaryData = items[i].binary;
          if (!binaryData || !binaryData[mergeBinaryField]) {
            throw new NodeOperationError(
              this.getNode(),
              `Item ${i + 1} does not have binary field "${mergeBinaryField}"`,
              { itemIndex: i },
            );
          }

          const pdfBuffer = await this.helpers.getBinaryDataBuffer(i, mergeBinaryField);
          const sourcePdf = await PDFDocument.load(pdfBuffer);
          const totalPages = sourcePdf.getPageCount();

          let pageIndices: number[];
          if (mergeMode === 'select') {
            const pagesStr = this.getNodeParameter('mergePages', i) as string;
            pageIndices = PdfTextWriter.parsePageSelection(pagesStr, totalPages);
          } else {
            pageIndices = sourcePdf.getPageIndices();
          }

          const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
          for (const page of copiedPages) {
            mergedPdf.addPage(page);
          }
        }

        const mergedBytes = await mergedPdf.save();
        const mergedBuffer = Buffer.from(mergedBytes);

        const newBinaryData = await this.helpers.prepareBinaryData(
          mergedBuffer,
          mergeFileName || 'merged.pdf',
          'application/pdf',
        );

        returnData.push({
          json: {
            pdfMerged: true,
            inputFiles: items.length,
            pageCount: mergedPdf.getPageCount(),
          },
          binary: {
            [mergeOutputField]: newBinaryData,
          },
          pairedItem: { item: 0 },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: 0 },
          });
        } else {
          throw error;
        }
      }

      return [returnData];
    }

    // ─── Write Text ─────────────────────────────────────────────────────
    for (let i = 0; i < items.length; i++) {
      try {
        const inputField = this.getNodeParameter('inputField', i) as string;
        const outputField = this.getNodeParameter('outputField', i) as string;
        const textEntriesParam = this.getNodeParameter('textEntries', i) as {
          entry?: Array<{
            text: string;
            page: number;
            x: number;
            y: number;
            yOrigin: string;
            fontSize: number;
            font: string;
            color: string;
            rotation: number;
            opacity: number;
          }>;
        };

        const entries = textEntriesParam.entry ?? [];

        // Get the binary PDF data
        const binaryData = this.helpers.assertBinaryData(i, inputField);
        const pdfBuffer = await this.helpers.getBinaryDataBuffer(i, inputField);

        // Load the PDF
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();

        // Font map
        const fontMap: Record<string, StandardFonts> = {
          'Helvetica': StandardFonts.Helvetica,
          'Helvetica-Bold': StandardFonts.HelveticaBold,
          'Helvetica-Oblique': StandardFonts.HelveticaOblique,
          'Times-Roman': StandardFonts.TimesRoman,
          'Times-Bold': StandardFonts.TimesRomanBold,
          'Courier': StandardFonts.Courier,
          'Courier-Bold': StandardFonts.CourierBold,
        };

        // Cache for embedded fonts to avoid re-embedding the same font
        const fontCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>>();

        // Process each text entry
        for (const entry of entries) {
          const targetPageNum = entry.page ?? 1;
          const pagesToWrite = targetPageNum === 0
            ? pages
            : [pages[targetPageNum - 1]].filter(Boolean);

          if (pagesToWrite.length === 0) {
            throw new NodeOperationError(
              this.getNode(),
              `Page ${targetPageNum} does not exist. The PDF has ${pages.length} page(s).`,
              { itemIndex: i },
            );
          }

          const fontKey = entry.font ?? 'Helvetica';
          if (!fontCache.has(fontKey)) {
            fontCache.set(fontKey, await pdfDoc.embedFont(
              fontMap[fontKey] ?? StandardFonts.Helvetica,
            ));
          }
          const embeddedFont = fontCache.get(fontKey)!;

          // Parse hex color
          const hex = (entry.color ?? '#000000').replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;

          for (const page of pagesToWrite) {
            const { height } = page.getSize();
            let yCoord = entry.y ?? 50;
            if (entry.yOrigin === 'top') {
              yCoord = height - yCoord;
            }

            page.drawText(entry.text ?? '', {
              x: entry.x ?? 50,
              y: yCoord,
              size: entry.fontSize ?? 12,
              font: embeddedFont,
              color: rgb(r, g, b),
              rotate: degrees(entry.rotation ?? 0),
              opacity: entry.opacity ?? 1,
            });
          }
        }

        // Save the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const modifiedBuffer = Buffer.from(modifiedPdfBytes);

        const newBinaryData = await this.helpers.prepareBinaryData(
          modifiedBuffer,
          binaryData.fileName ?? 'output.pdf',
          'application/pdf',
        );

        returnData.push({
          json: {
            ...items[i].json,
            pdfModified: true,
            pageCount: pages.length,
            textEntriesWritten: entries.length,
          },
          binary: {
            ...(items[i].binary ?? {}),
            [outputField]: newBinaryData,
          },
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
