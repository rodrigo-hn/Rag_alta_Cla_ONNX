/**
 * Servicio de exportación a PDF y Word
 */
import PDFDocument from 'pdfkit';
import { Document, Paragraph, TextRun, Packer, AlignmentType, HeadingLevel } from 'docx';
import { logger } from '../config/logger';

export class ExportService {
  /**
   * Genera un PDF con la epicrisis
   */
  async generatePDF(
    epicrisisText: string,
    options: {
      patientName?: string;
      episodeId?: string;
      generatedAt?: string;
    } = {}
  ): Promise<Buffer> {
    logger.info('Generando PDF de epicrisis');

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: 72,
            bottom: 72,
            left: 72,
            right: 72
          }
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Encabezado
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('INFORME DE ALTA HOSPITALARIA', { align: 'center' });

        doc.moveDown();

        // Información del paciente
        if (options.patientName || options.episodeId) {
          doc.fontSize(10).font('Helvetica');

          if (options.patientName) {
            doc.text(`Paciente: ${options.patientName}`);
          }
          if (options.episodeId) {
            doc.text(`N° Episodio: ${options.episodeId}`);
          }
          if (options.generatedAt) {
            doc.text(`Fecha de emisión: ${options.generatedAt}`);
          }

          doc.moveDown();
          doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke();
          doc.moveDown();
        }

        // Epicrisis
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(epicrisisText, {
            align: 'justify',
            lineGap: 4
          });

        doc.moveDown(2);

        // Pie de página
        doc
          .fontSize(8)
          .fillColor('#666666')
          .text(
            'Documento generado automáticamente. Para uso médico exclusivo.',
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        logger.error('Error generando PDF:', error);
        reject(error);
      }
    });
  }

  /**
   * Genera un documento Word con la epicrisis
   */
  async generateWord(
    epicrisisText: string,
    options: {
      patientName?: string;
      episodeId?: string;
      generatedAt?: string;
    } = {}
  ): Promise<Buffer> {
    logger.info('Generando documento Word de epicrisis');

    try {
      const children: Paragraph[] = [];

      // Título
      children.push(
        new Paragraph({
          text: 'INFORME DE ALTA HOSPITALARIA',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      );

      // Información del paciente
      if (options.patientName) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Paciente: ', bold: true }),
              new TextRun({ text: options.patientName })
            ],
            spacing: { after: 100 }
          })
        );
      }

      if (options.episodeId) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'N° Episodio: ', bold: true }),
              new TextRun({ text: options.episodeId })
            ],
            spacing: { after: 100 }
          })
        );
      }

      if (options.generatedAt) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Fecha de emisión: ', bold: true }),
              new TextRun({ text: options.generatedAt })
            ],
            spacing: { after: 300 }
          })
        );
      }

      // Separador
      children.push(
        new Paragraph({
          text: '─'.repeat(80),
          spacing: { after: 300 }
        })
      );

      // Epicrisis
      children.push(
        new Paragraph({
          text: epicrisisText,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 400, line: 360 }
        })
      );

      // Pie de página
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Documento generado automáticamente. Para uso médico exclusivo.',
              size: 18,
              color: '666666'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 }
        })
      );

      const doc = new Document({
        sections: [
          {
            properties: {},
            children
          }
        ]
      });

      const buffer = await Packer.toBuffer(doc);
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Error generando documento Word:', error);
      throw error;
    }
  }
}

export const exportService = new ExportService();
