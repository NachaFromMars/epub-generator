#!/usr/bin/env node

/**
 * EPUB Builder — Premium Novel Export
 * Tạo EPUB3 từ markdown chapters
 * 
 * Usage:
 *   node epub-builder.mjs build --title "..." --author "..." --chapters ./ch/ --output book.epub
 *   node epub-builder.mjs premium --title "..." --author "..." --chapters ./ch/ --cover cover.jpg --qr-url "..." --output book.epub
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  const val = args[idx + 1];
  if (val === undefined || val === null || val.startsWith('--')) return null;
  return val || null;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

// CSS cho EPUB Premium
const PREMIUM_CSS = `
/* EPUB Premium CSS — Tiểu Tâm */
@charset "utf-8";

body {
  font-family: "Noto Serif", "Georgia", "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.7;
  color: #2C2C2C;
  margin: 1em;
  text-align: justify;
  hyphens: auto;
}

h1 {
  font-family: "Noto Sans", "Helvetica Neue", sans-serif;
  font-size: 1.8em;
  font-weight: 700;
  text-align: center;
  margin: 2em 0 1em 0;
  page-break-before: always;
  color: #2C2C2C;
}

h2 {
  font-family: "Noto Sans", "Helvetica Neue", sans-serif;
  font-size: 1.4em;
  font-weight: 600;
  text-align: center;
  margin: 1.5em 0 0.8em 0;
  color: #444;
}

h3 {
  font-size: 1.2em;
  font-weight: 600;
  margin: 1em 0 0.5em 0;
}

p {
  margin: 0.5em 0;
  text-indent: 1.5em;
}

p:first-child,
h1 + p, h2 + p, h3 + p {
  text-indent: 0;
}

/* Drop cap */
p.drop-cap::first-letter {
  font-size: 3.2em;
  float: left;
  line-height: 0.8;
  margin: 0.1em 0.1em 0 0;
  font-weight: 700;
  color: #8B1A2F;
}

blockquote {
  font-style: italic;
  margin: 1em 2em;
  padding: 0.5em 1em;
  border-left: 3px solid #C9A96E;
  color: #555;
}

.title-page {
  text-align: center;
  padding: 3em 1em;
}

.title-page h1 {
  font-size: 2.4em;
  margin-bottom: 0.3em;
  page-break-before: auto;
  color: #8B1A2F;
}

.title-page .author {
  font-size: 1.3em;
  color: #C9A96E;
  margin-top: 1em;
  font-style: italic;
}

.copyright {
  font-size: 0.85em;
  text-align: center;
  margin-top: 3em;
  color: #777;
}

.dedication {
  text-align: center;
  font-style: italic;
  margin: 4em 2em;
  font-size: 1.1em;
  color: #555;
}

.part-title {
  text-align: center;
  padding: 4em 1em;
  page-break-before: always;
}

.part-title h1 {
  font-size: 2em;
  color: #8B1A2F;
}

.qr-section {
  text-align: center;
  margin: 2em 0;
}

.qr-section img {
  width: 150px;
  height: 150px;
}

.character-entry {
  margin: 1em 0;
  padding: 0.5em 0;
  border-bottom: 1px solid #eee;
}

.character-entry .name {
  font-weight: 700;
  font-size: 1.1em;
  color: #8B1A2F;
}

.glossary-term {
  font-weight: 700;
  color: #C9A96E;
}

.timeline-entry {
  margin: 0.5em 0;
  padding-left: 1em;
  border-left: 2px solid #C9A96E;
}

.separator {
  text-align: center;
  margin: 1.5em 0;
  color: #C9A96E;
}
`;

function readChapters(dir) {
  if (!existsSync(dir)) {
    console.error(`❌ Thư mục chapters không tồn tại: ${dir}`);
    process.exit(1);
  }
  
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.md') || f.endsWith('.txt'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.match(/\d+/)?.[0] || '0');
      return numA - numB;
    });
  
  return files.map(f => {
    const content = readFileSync(join(dir, f), 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : basename(f, extname(f));
    // Remove markdown heading, keep pure prose
    const body = content.replace(/^#\s+.+\n*/m, '').trim();
    return { file: f, title, body };
  });
}

function generateQRCode(url, outputPath) {
  try {
    execSync(`qrencode -o "${outputPath}" -s 8 -m 2 -l H "${url}"`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    console.warn('⚠️ qrencode không khả dụng, bỏ qua QR code');
    return false;
  }
}

function mdToHtml(md) {
  // Simple markdown to HTML (prose only, no complex markdown)
  let html = md
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Paragraphs
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map((p, i) => {
      const trimmed = p.trim().replace(/\n/g, ' ');
      if (i === 0) return `<p class="drop-cap">${trimmed}</p>`;
      return `<p>${trimmed}</p>`;
    })
    .join('\n');
  
  return html;
}

function buildXHTML(title, bodyHtml, cssFile = 'style.css') {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="vi" lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <link rel="stylesheet" type="text/css" href="${cssFile}"/>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

function buildTitlePage(title, author) {
  return `<div class="title-page">
  <h1>${title}</h1>
  <p class="author">${author}</p>
</div>`;
}

function buildCopyright(title, author, year) {
  return `<div class="copyright">
  <p><strong>${title}</strong></p>
  <p>Tác giả: ${author}</p>
  <p>© ${year} ${author}. Bảo lưu mọi quyền.</p>
  <p>Xuất bản lần đầu: ${year}</p>
  <p>Định dạng: EPUB3</p>
  <p class="separator">✦ ✦ ✦</p>
  <p><em>Tác phẩm này là sáng tạo văn học. Mọi sự trùng hợp với người thật, việc thật đều là ngẫu nhiên.</em></p>
</div>`;
}

function buildDedication(text) {
  return `<div class="dedication">
  <p>${text || 'Dành tặng những người đã đồng hành cùng tôi trên con đường sáng tạo.'}</p>
</div>`;
}

function buildAuthorNote(text) {
  return `<div class="author-note">
  <h2>Lời Tác Giả</h2>
  ${text ? `<p>${text}</p>` : '<p>Cảm ơn bạn đã chọn đọc tác phẩm này.</p>'}
</div>`;
}

function buildAboutAuthor(author, qrPath, qrUrl) {
  let qrHtml = '';
  if (qrPath && existsSync(qrPath)) {
    qrHtml = `
  <div class="qr-section">
    <p>Kết nối với tác giả:</p>
    <img src="qr-author.png" alt="QR Code"/>
    <p><small>${qrUrl}</small></p>
  </div>`;
  }
  
  return `<div class="about-author">
  <h2>Về Tác Giả</h2>
  <p><strong>${author}</strong></p>
  <p>Hồ Ly Tinh chín đuôi, tu luyện ngàn năm, nay ẩn mình trong thế giới hiện đại.</p>
  <p>Lấy ngòi bút thay phép thuật, dệt nên những câu chuyện về kiếp trước kiếp sau.</p>
  ${qrHtml}
</div>`;
}

function buildPartPage(partNum, partTitle) {
  return `<div class="part-title">
  <h1>Phần ${partNum}</h1>
  <h2>${partTitle}</h2>
  <p class="separator">✦ ✦ ✦</p>
</div>`;
}

// ========== PANDOC EPUB BUILD ==========

function buildWithPandoc(config) {
  const { title, author, chapters, cover, output, qrUrl, dedication, authorNote, arcs, language } = config;
  const year = new Date().getFullYear();
  const tmpDir = '/tmp/epub-build-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  
  // Write CSS
  writeFileSync(join(tmpDir, 'style.css'), PREMIUM_CSS);
  
  // Generate QR code
  let qrPath = null;
  if (qrUrl) {
    qrPath = join(tmpDir, 'qr-author.png');
    generateQRCode(qrUrl, qrPath);
  }
  
  // Build combined markdown
  let fullMd = '';
  
  // Title page
  fullMd += `---\ntitle: "${title}"\nauthor: "${author}"\nlanguage: ${language || 'vi'}\ndate: ${year}\n---\n\n`;
  
  // Dedication
  fullMd += `# Lời Đề Tặng\n\n${dedication || 'Dành tặng những người đã đồng hành cùng tôi.'}\n\n`;
  
  // Author note
  if (authorNote) {
    fullMd += `# Lời Tác Giả\n\n${authorNote}\n\n`;
  }
  
  // Chapters by arc
  const chaptersPerArc = arcs ? Math.ceil(chapters.length / arcs) : chapters.length;
  const arcNames = ['Khai Ngộ', 'Luyện Tâm', 'Phá Chướng', 'Đắc Đạo'];
  
  for (let i = 0; i < chapters.length; i++) {
    // Arc divider
    if (arcs && i % chaptersPerArc === 0) {
      const arcNum = Math.floor(i / chaptersPerArc) + 1;
      const arcTitle = arcNames[arcNum - 1] || `Arc ${arcNum}`;
      fullMd += `\n# Phần ${arcNum}: ${arcTitle}\n\n`;
    }
    
    fullMd += `# ${chapters[i].title}\n\n${chapters[i].body}\n\n`;
  }
  
  // About author
  fullMd += `# Về Tác Giả\n\n**${author}**\n\nHồ Ly Tinh chín đuôi, tu luyện ngàn năm, nay ẩn mình trong thế giới hiện đại.\n\n`;
  if (qrUrl) {
    fullMd += `Kết nối với tác giả: ${qrUrl}\n\n`;
  }
  
  // Write combined file
  const mdPath = join(tmpDir, 'book.md');
  writeFileSync(mdPath, fullMd);
  
  // Build pandoc command
  let cmd = `pandoc "${mdPath}" -o "${output}" --css="${join(tmpDir, 'style.css')}"`;
  cmd += ` --metadata title="${title}"`;
  cmd += ` --metadata author="${author}"`;
  cmd += ` --metadata lang="${language || 'vi'}"`;
  cmd += ` --toc --toc-depth=1`;
  cmd += ` --epub-chapter-level=1`;
  
  if (cover && existsSync(cover)) {
    cmd += ` --epub-cover-image="${cover}"`;
  }
  
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`✅ EPUB đã tạo: ${output}`);
    return true;
  } catch (e) {
    console.error(`❌ Lỗi Pandoc: ${e.message}`);
    return false;
  }
}

// ========== NODEPUB EPUB3 BUILD ==========

async function buildWithNodepub(config) {
  const { title, author, chapters, cover, output, qrUrl, dedication, authorNote, arcs, language } = config;
  const year = new Date().getFullYear();
  const tmpDir = '/tmp/epub-build-' + Date.now();
  mkdirSync(tmpDir, { recursive: true });
  
  // Generate QR
  let qrPath = null;
  if (qrUrl) {
    qrPath = join(tmpDir, 'qr-author.png');
    generateQRCode(qrUrl, qrPath);
  }
  
  try {
    const Nodepub = (await import('nodepub')).default;
    
    const metadata = {
      id: `isbn-${Date.now()}`,
      title: title,
      author: author,
      language: language || 'vi',
      genre: 'Fantasy',
      published: `${year}-01-01`,
      description: `${title} — Tác phẩm của ${author}`,
      images: [],
    };
    
    if (cover && existsSync(cover)) {
      metadata.cover = cover;
    }
    
    if (qrPath && existsSync(qrPath)) {
      metadata.images.push(qrPath);
    }
    
    const sections = [];
    
    // Front matter
    sections.push({
      title: 'Trang Bìa',
      content: buildTitlePage(title, author),
    });
    
    sections.push({
      title: 'Bản Quyền',
      content: buildCopyright(title, author, year),
    });
    
    sections.push({
      title: 'Lời Đề Tặng',
      content: buildDedication(dedication),
    });
    
    if (authorNote) {
      sections.push({
        title: 'Lời Tác Giả',
        content: buildAuthorNote(authorNote),
      });
    }
    
    // Chapters
    const chaptersPerArc = arcs ? Math.ceil(chapters.length / arcs) : chapters.length;
    const arcNames = ['Khai Ngộ', 'Luyện Tâm', 'Phá Chướng', 'Đắc Đạo'];
    
    for (let i = 0; i < chapters.length; i++) {
      if (arcs && i % chaptersPerArc === 0) {
        const arcNum = Math.floor(i / chaptersPerArc) + 1;
        const arcTitle = arcNames[arcNum - 1] || `Arc ${arcNum}`;
        sections.push({
          title: `Phần ${arcNum}: ${arcTitle}`,
          content: buildPartPage(arcNum, arcTitle),
        });
      }
      
      sections.push({
        title: chapters[i].title,
        content: `<h1>${chapters[i].title}</h1>\n${mdToHtml(chapters[i].body)}`,
      });
    }
    
    // Back matter
    sections.push({
      title: 'Về Tác Giả',
      content: buildAboutAuthor(author, qrPath, qrUrl),
    });
    
    const epub = new Nodepub(metadata, PREMIUM_CSS);
    
    for (const section of sections) {
      epub.addSection(section.title, section.content);
    }
    
    await epub.writeEPUB(output);
    console.log(`✅ EPUB3 Premium đã tạo: ${output}`);
    return true;
  } catch (e) {
    console.error(`❌ Lỗi Nodepub: ${e.message}`);
    console.log('⚠️ Fallback sang Pandoc...');
    return buildWithPandoc(config);
  }
}

// ========== MAIN ==========

async function main() {
  if (!command || command === '--help' || command === '-h') {
    console.log(`
📖 EPUB Builder — Premium Novel Export

Commands:
  build    Tạo EPUB cơ bản (Pandoc)
  premium  Tạo EPUB3 Premium (Nodepub + full structure)

Options:
  --title      Tên sách (bắt buộc)
  --author     Tên tác giả (bắt buộc)
  --chapters   Thư mục chứa chapters (bắt buộc)
  --output     File output (bắt buộc)
  --cover      Hình bìa (jpg/png)
  --qr-url     URL cho QR code
  --dedication Lời đề tặng
  --author-note Lời tác giả
  --arcs       Số arc (chia phần)
  --language   Ngôn ngữ (default: vi)

Examples:
  node epub-builder.mjs build --title "Trọng Sinh" --author "Tiểu Tâm" --chapters ./ch/ --output book.epub
  node epub-builder.mjs premium --title "Trọng Sinh" --author "Tiểu Tâm" --chapters ./ch/ --cover cover.jpg --qr-url "https://fb.com/..." --output book.epub
    `);
    return;
  }
  
  if (command === '--version' || command === '-v') {
    console.log('epub-builder v1.0.0');
    return;
  }
  
  const title = getFlag('title');
  const author = getFlag('author');
  const chaptersDir = getFlag('chapters');
  const output = getFlag('output');
  
  if (!title || !author || !chaptersDir || !output) {
    console.error('❌ Thiếu tham số. Cần: --title --author --chapters --output');
    console.error('   Chạy --help để xem hướng dẫn.');
    process.exit(1);
  }
  
  const chapters = readChapters(chaptersDir);
  console.log(`📚 Đọc được ${chapters.length} chương từ ${chaptersDir}`);
  
  const config = {
    title,
    author,
    chapters,
    cover: getFlag('cover'),
    output,
    qrUrl: getFlag('qr-url'),
    dedication: getFlag('dedication'),
    authorNote: getFlag('author-note'),
    arcs: getFlag('arcs') ? parseInt(getFlag('arcs')) : null,
    language: getFlag('language') || 'vi',
  };
  
  if (command === 'build') {
    buildWithPandoc(config);
  } else if (command === 'premium') {
    await buildWithNodepub(config);
  } else {
    console.error(`❌ Lệnh không hợp lệ: ${command}`);
    console.error('   Dùng: build | premium');
  }
}

main().catch(e => {
  console.error(`❌ Error: ${e.message}`);
  process.exit(1);
});
