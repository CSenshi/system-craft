import { JSDOM } from "jsdom";

export type UrlExtractorInput = {
  content: string;
  type: 'html' | 'text';
};

export class UrlExtractorService {
  extractUrls(input: UrlExtractorInput): string[] {
    if (input.type === 'html') {
      return this.extractUrlsFromHtml(input.content);
    }

    if (input.type === 'text') {
      return this.extractUrlsFromText(input.content);
    }

    throw new Error(`Unsupported content type: ${input.type}`);
  }

  private extractUrlsFromHtml(content: string): string[] {
    const urls: Set<string> = new Set();
    const dom = new JSDOM(content);
    const doc = dom.window.document;

    // Extract from <a href="">
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href) urls.add(href);
    });

    // Extract from <img src="">
    doc.querySelectorAll('img[src]').forEach(img => {
      const src = img.getAttribute('src');
      if (src) urls.add(src);
    });

    // Extract from <script src="">
    doc.querySelectorAll('script[src]').forEach(script => {
      const src = script.getAttribute('src');
      if (src) urls.add(src);
    });

    // Extract from <link href="">
    doc.querySelectorAll('link[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href) urls.add(href);
    });

    // Extract from <form action="">
    doc.querySelectorAll('form[action]').forEach(form => {
      const action = form.getAttribute('action');
      if (action) urls.add(action);
    });

    return Array.from(urls);
  }


  private extractUrlsFromText(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s"'<>]+/g;
    const matches = content.match(urlRegex);
    return matches ? Array.from(new Set(matches)) : [];
  }
}