import { UrlExtractor } from '.';

describe('UrlExtractorService', () => {
  let service: UrlExtractor.Service;

  beforeEach(() => {
    service = new UrlExtractor.Service();
  });

  describe('HTML extraction', () => {
    it('should extract URLs from HTML content', () => {
      const htmlContent = `
        <html>
          <body>
            <a href="https://example.com">Example</a>
            <img src="https://example.com/image.png">
            <script src="https://example.com/script.js"></script>
            <link href="https://example.com/style.css">
            <form action="https://example.com/submit"></form>
          </body>
        </html>
      `;

      const urls = service.extractUrls({
        content: htmlContent,
        type: 'html',
      });

      expect(urls).toEqual([
        'https://example.com',
        'https://example.com/image.png',
        'https://example.com/script.js',
        'https://example.com/style.css',
        'https://example.com/submit',
      ]);
    });

    it('should return empty array for empty HTML content', () => {
      const urls = service.extractUrls({
        content: '',
        type: 'html',
      });

      expect(urls).toEqual([]);
    });

    it('should handle HTML with relative URLs', () => {
      const htmlContent = `
        <html>
          <body>
            <a href="/relative/path">Relative Link</a>
            <img src="./image.jpg">
            <script src="../scripts/app.js"></script>
          </body>
        </html>
      `;

      const urls = service.extractUrls({
        content: htmlContent,
        type: 'html',
      });

      expect(urls).toEqual([
        '/relative/path',
        './image.jpg',
        '../scripts/app.js',
      ]);
    });

    it('should remove duplicate URLs', () => {
      const htmlContent = `
        <html>
          <body>
            <a href="https://example.com">Link 1</a>
            <a href="https://example.com">Link 2</a>
            <img src="https://example.com/image.png">
            <img src="https://example.com/image.png">
          </body>
        </html>
      `;

      const urls = service.extractUrls({
        content: htmlContent,
        type: 'html',
      });

      expect(urls).toEqual([
        'https://example.com',
        'https://example.com/image.png',
      ]);
    });
  });

  describe('Text extraction', () => {
    it('should extract URLs from text content', () => {
      const textContent = `
        Check out these links: https://example.com and http://test.org
        Also visit https://another-site.com/path?param=value
      `;

      const urls = service.extractUrls({
        content: textContent,
        type: 'text',
      });

      expect(urls).toEqual([
        'https://example.com',
        'http://test.org',
        'https://another-site.com/path?param=value',
      ]);
    });

    it('should return empty array for empty text content', () => {
      const urls = service.extractUrls({
        content: '',
        type: 'text',
      });

      expect(urls).toEqual([]);
    });
  });

  describe('General', () => {
    it('should throw error for unsupported content type', () => {
      expect(() => {
        service.extractUrls({
          content: 'some content',
          // @ts-expect-error Invalid type for testing
          type: 'text/new-type',
        });
      }).toThrow('Unsupported content type: text/new-type');
    });
  });

  describe('Domain handling', () => {
    it('should format URLs with domain', () => {
      const htmlContent = `
        <html>
          <body>
            <a href="/relative/path">Relative Link</a>
            <img src="./image.jpg">
          </body>
        </html>
      `;

      const urls = service.extractUrls({
        content: htmlContent,
        type: 'html',
        domain: 'example.com',
        protocol: 'https',
      });

      expect(urls).toEqual([
        'https://example.com/relative/path',
        'https://example.com/./image.jpg',
      ]);
    });

    it('should handle absolute URLs without domain', () => {
      const textContent = `
        Visit https://example.com and http://test.org
      `;

      const urls = service.extractUrls({
        content: textContent,
        type: 'text',
      });

      expect(urls).toEqual(['https://example.com', 'http://test.org']);
    });
  });
});
