// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Widget
} from '@phosphor/widgets';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

declare var require: any;
let PDF = require('pdfjs-dist');
PDF = require('pdfjs-dist/web/pdf_viewer');

import '../style/index.css';
import 'pdfjs-dist/web/pdf_viewer.css';

/**
 * The MIME type for PDF.
 */
export
const MIME_TYPE = 'application/pdf';

export
const PDF_CLASS = 'pdfViewer';

export
const PDF_CONTAINER_CLASS = 'jp-PDFJSContainer';

/**
 * A class for rendering a PDF document.
 */
export
class RenderedPDF extends Widget implements IRenderMime.IRenderer {
  constructor() {
    super({ node: Private.createNode() });
    PDF.PDFJS.disableWorker = true;
    this._pdfViewer = new PDF.PDFJS.PDFViewer({
        container: this.node,
    });
  }

  /**
   * Render PDF into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    return new Promise<void>(resolve => {
      let data = model.data[MIME_TYPE] as string;
      // If there is no data, do nothing.
      if (!data) {
        resolve (void 0);
      }
      const blob = Private.b64toBlob(data, MIME_TYPE);

      let oldUrl = this._objectUrl;
      this._objectUrl = URL.createObjectURL(blob);

      //Try to keep the scroll position.
      const scrollTop = this.node.scrollTop;

      PDF.PDFJS.getDocument(this._objectUrl).then((pdfDocument: any) => {
        this._pdfViewer.setDocument(pdfDocument);
        this._pdfViewer.pagesPromise.then(() => {
          this.node.scrollTop = scrollTop;
          resolve(void 0);
        });
      });

      // Release reference to any previous object url.
      if (oldUrl) {
        try {
          URL.revokeObjectURL(oldUrl);
        } catch (error) { /* no-op */ }
      }
    });
  }

  /**
   * Dispose of the resources held by the pdf widget.
   */
  dispose() {
    try {
      URL.revokeObjectURL(this._objectUrl);
    } catch (error) { /* no-op */ }
    super.dispose();
  }

  private _objectUrl = '';
  private _pdfViewer: any;
}


/**
 * A mime renderer factory for PDF data.
 */
export
const rendererFactory: IRenderMime.IRendererFactory = {
  safe: false,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new RenderedPDF()
};


const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  {
    id: '@jupyterlab/pdfjs-extension:factory',
    rendererFactory,
    rank: 0,
    dataType: 'string',
    documentWidgetFactoryOptions: {
      name: 'PDFJS',
      modelName: 'base64',
      primaryFileType: 'PDF',
      fileTypes: ['PDF'],
      defaultFor: ['PDF']
    }
  }
];

export default extensions;


/**
 * A namespace for PDF widget private data.
 */
namespace Private {
  /**
   * Create the node for the PDF widget.
   */
  export
  function createNode(): HTMLElement {
    let node = document.createElement('div');
    node.className = PDF_CONTAINER_CLASS;
    let pdf = document.createElement('div');
    pdf.className = PDF_CLASS;
    node.appendChild(pdf);
    return node;
  }

  /**
   * Convert a base64 encoded string to a Blob object.
   * Modified from a snippet found here:
   * https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
   *
   * @param b64Data - The base64 encoded data.
   *
   * @param contentType - The mime type of the data.
   *
   * @param sliceSize - The size to chunk the data into for processing.
   *
   * @returns a Blob for the data.
   */
  export
  function b64toBlob(b64Data: string, contentType: string = '', sliceSize: number = 512): Blob {
    const byteCharacters = atob(b64Data);
    let byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      let slice = byteCharacters.slice(offset, offset + sliceSize);

      let byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      let byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }
}
